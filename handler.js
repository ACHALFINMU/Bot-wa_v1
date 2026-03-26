const fs = require("fs")
const https = require("https")
require("dotenv").config()

const owners = [process.env.OWNER_NUMBER || "628xxxxxxxxxxxx"]

// ======================
// FUNGSI AI (Groq API)
// ======================
async function tanyaAI(pertanyaan) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content: "Kamu adalah asisten WhatsApp yang helpful, ramah, dan menjawab dalam Bahasa Indonesia. Jawab dengan singkat, jelas, dan mudah dipahami."
        },
        {
          role: "user",
          content: pertanyaan
        }
      ]
    })

    const options = {
      hostname: "api.groq.com",
      path: "/openai/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Length": Buffer.byteLength(body)
      }
    }

    const req = https.request(options, (res) => {
      let data = ""
      res.on("data", chunk => data += chunk)
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data)
          const teks = parsed?.choices?.[0]?.message?.content
          if (teks) resolve(teks)
          else resolve("❌ AI tidak bisa menjawab saat ini.")
        } catch (e) {
          console.log("=== PARSE ERROR ===", e.message)
          resolve("❌ Gagal memproses jawaban AI.")
        }
      })
    })

    req.on("error", () => resolve("❌ Gagal terhubung ke AI."))
    req.write(body)
    req.end()
  })
}

// ======================
// LOAD DATABASE (AMAN)
// ======================
let db
try {
  db = JSON.parse(fs.readFileSync("./database.json"))
} catch {
  db = { allowedUsers: [] }
  fs.writeFileSync("./database.json", JSON.stringify(db, null, 2))
}

if (!db.allowedUsers) db.allowedUsers = []

const saveDB = () => {
  fs.writeFileSync("./database.json", JSON.stringify(db, null, 2))
}

// ======================
// HELPER: cek apakah pesan dari/terkait saluran
// ======================
function isChannelMessage(msg) {
  const m = msg.message

  // 1. Forward dari newsletter (saluran WA)
  const ctxInfo =
    m?.extendedTextMessage?.contextInfo ||
    m?.imageMessage?.contextInfo ||
    m?.videoMessage?.contextInfo ||
    m?.documentMessage?.contextInfo ||
    m?.audioMessage?.contextInfo ||
    m?.stickerMessage?.contextInfo ||
    m?.buttonsMessage?.contextInfo ||
    m?.listMessage?.contextInfo ||
    m?.templateMessage?.contextInfo

  if (ctxInfo?.forwardedNewsletterMessageInfo) return true
  if (ctxInfo?.forwardAttribution === "NEWSLETTER") return true

  // 2. Tipe pesan langsung dari newsletter
  if (m?.newsletterAdminInviteMessage) return true
  if (m?.scheduledCallCreationMessage) return true

  // 3. Cek semua kemungkinan teks di pesan
  const textSources = [
    m?.conversation,
    m?.extendedTextMessage?.text,
    m?.imageMessage?.caption,
    m?.videoMessage?.caption,
    m?.documentMessage?.caption,
    m?.buttonsMessage?.contentText,
    m?.listMessage?.description,
    m?.templateMessage?.hydratedTemplate?.hydratedContentText,
  ]

  for (const t of textSources) {
    if (!t) continue
    const lower = t.toLowerCase()
    if (
      lower.includes("chat.whatsapp.com") ||          // link grup
      lower.includes("whatsapp.com/channel") ||       // link saluran
      lower.includes("wa.me/channel") ||              // link saluran pendek
      lower.includes("whatsapp.com/newsletter")       // newsletter
    ) return true
  }

  // 4. Cek jika pengirim aslinya JID newsletter (jid@newsletter)
  if (ctxInfo?.participant?.endsWith("@newsletter")) return true
  if (ctxInfo?.remoteJid?.endsWith("@newsletter")) return true

  return false
}

// ======================
// HANDLER
// ======================
module.exports = async (sock, msg) => {
  try {
    const from = msg.key.remoteJid
    const sender = msg.key.participant || msg.key.remoteJid
    const senderNumber = sender.split("@")[0].split(":")[0]

    const body =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text

    const text = body ? body.toLowerCase() : ""
    const isGroup = from.endsWith("@g.us")

    // ======================
    // GROUP DATA
    // ======================
    let groupMetadata = isGroup ? await sock.groupMetadata(from) : {}
    let participants = isGroup ? groupMetadata.participants : []
    let groupAdmins = isGroup
      ? participants.filter(v => v.admin !== null).map(v => v.id)
      : []

    const isAdmin = groupAdmins.includes(sender)
    const isOwner = owners.includes(senderNumber)

    const isAllowed =
      isAdmin ||
      isOwner ||
      db.allowedUsers.includes(senderNumber)

    // ======================
    // ANTI LINK & SALURAN (KUAT)
    // ======================
    if (isGroup && !isAllowed) {
      if (isChannelMessage(msg)) {
        if (groupAdmins.includes(sender)) return

        try {
          await sock.sendMessage(from, {
            delete: {
              remoteJid: from,
              fromMe: false,
              id: msg.key.id,
              participant: sender
            }
          })
        } catch (e) {
          console.log("Gagal hapus pesan:", e.message)
        }

        try {
          await sock.groupParticipantsUpdate(from, [sender], "remove")
        } catch (e) {
          console.log("Gagal kick:", e.message)
        }

        sock.sendMessage(from, {
          text: `🚫 @${senderNumber} dikeluarkan karena mengirim link/konten saluran!`,
          mentions: [sender]
        })

        return
      }
    }

    if (!text) return

    // ======================
    // MENU
    // ======================
    if (text === ".menu") {
      if (!isAllowed)
        return sock.sendMessage(from, { text: "❌ Khusus admin & owner" })

      return sock.sendMessage(from, {
        text: `
╭─❖「 *MENU ADMIN* 」❖
│ 👑 Admin / Owner / Akses
│
│ ⚙️ .kick (reply/tag)
│ 🗑️ .del (reply)
│ 🔓 .open
│ 🔒 .close
│
│ ⭐ .addakses (tag)
│ ❌ .delakses (tag)
│ 📋 .listakses
│
│ 🤖 .ai <pertanyaan>
╰───────────────
        `.trim()
      })
    }

    // ======================
    // ADD AKSES
    // ======================
    if (text.startsWith(".addakses")) {
      if (!isGroup) return sock.sendMessage(from, { text: "❌ Hanya di grup" })
      if (!isOwner && !isAdmin) return sock.sendMessage(from, { text: "❌ Khusus owner & admin" })

      let target =
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

      if (!target)
        return sock.sendMessage(from, { text: "❌ Tag orangnya" })

      const targetNumber = target.split("@")[0].split(":")[0]

      if (db.allowedUsers.includes(targetNumber))
        return sock.sendMessage(from, { text: "⚠️ Sudah ada akses" })

      db.allowedUsers.push(targetNumber)
      saveDB()

      return sock.sendMessage(from, {
        text: `✅ Akses ditambahkan untuk @${targetNumber}`,
        mentions: [target]
      })
    }

    // ======================
    // DEL AKSES
    // ======================
    if (text.startsWith(".delakses")) {
      if (!isOwner)
        return sock.sendMessage(from, { text: "❌ Khusus owner" })

      let target =
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

      if (!target)
        return sock.sendMessage(from, { text: "❌ Tag orangnya" })

      const targetNumber = target.split("@")[0].split(":")[0]
      db.allowedUsers = db.allowedUsers.filter(v => v !== targetNumber)
      saveDB()

      return sock.sendMessage(from, {
        text: `❌ Akses dihapus untuk @${targetNumber}`,
        mentions: [target]
      })
    }

    // ======================
    // LIST AKSES
    // ======================
    if (text === ".listakses") {
      if (!isOwner)
        return sock.sendMessage(from, { text: "❌ Khusus owner" })

      if (db.allowedUsers.length === 0)
        return sock.sendMessage(from, { text: "📭 Belum ada user" })

      let teks = "📋 LIST AKSES:\n\n"
      db.allowedUsers.forEach((u, i) => {
        teks += `${i + 1}. @${u}\n`
      })

      const mentions = db.allowedUsers.map(u => u + "@s.whatsapp.net")
      return sock.sendMessage(from, { text: teks, mentions })
    }

    // ======================
    // KICK
    // ======================
    if (text.startsWith(".kick")) {
      if (!isAllowed)
        return sock.sendMessage(from, { text: "❌ Khusus admin & owner" })
      if (!isGroup)
        return sock.sendMessage(from, { text: "❌ Hanya di grup" })

      let target =
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
        msg.message?.extendedTextMessage?.contextInfo?.participant

      if (!target)
        return sock.sendMessage(from, { text: "❌ Reply/tag member" })

      if (groupAdmins.includes(target))
        return sock.sendMessage(from, { text: "❌ Tidak bisa kick admin" })

      await sock.groupParticipantsUpdate(from, [target], "remove")
      sock.sendMessage(from, {
        text: `✅ @${target.split("@")[0]} berhasil dikeluarkan`,
        mentions: [target]
      })
    }

    // ======================
    // DELETE PESAN
    // ======================
    if (text === ".del") {
      if (!isAllowed)
        return sock.sendMessage(from, { text: "❌ Khusus admin & owner" })

      let quoted = msg.message?.extendedTextMessage?.contextInfo

      if (!quoted)
        return sock.sendMessage(from, { text: "❌ Reply pesan" })

      await sock.sendMessage(from, {
        delete: {
          remoteJid: from,
          fromMe: false,
          id: quoted.stanzaId,
          participant: quoted.participant
        }
      })
    }

    // ======================
    // OPEN GROUP
    // ======================
    if (text === ".open") {
      if (!isAllowed)
        return sock.sendMessage(from, { text: "❌ Khusus admin & owner" })

      await sock.groupSettingUpdate(from, "not_announcement")
      sock.sendMessage(from, { text: "✅ Grup dibuka" })
    }

    // ======================
    // CLOSE GROUP
    // ======================
    if (text === ".close") {
      if (!isAllowed)
        return sock.sendMessage(from, { text: "❌ Khusus admin & owner" })

      await sock.groupSettingUpdate(from, "announcement")
      sock.sendMessage(from, { text: "🔒 Grup ditutup" })
    }

    // ======================
    // 🤖 FITUR AI
    // ======================
    if (text.startsWith(".ai ")) {
      if (!isAllowed)
        return sock.sendMessage(from, { text: "❌ Fitur AI khusus admin & owner" })

      const pertanyaan = body.slice(4).trim()
      if (!pertanyaan)
        return sock.sendMessage(from, { text: "❌ Tulis pertanyaanmu setelah .ai\nContoh: .ai Apa itu fotosintesis?" })

      await sock.sendMessage(from, { text: "🤖 AI sedang menjawab..." })

      const jawaban = await tanyaAI(pertanyaan)

      return sock.sendMessage(from, {
        text: `🤖 *AI menjawab:*\n\n${jawaban}`
      })
    }

  } catch (err) {
    console.log("Error handler:", err)
  }
}
