module.exports = async (sock, anu) => {
  try {
    const metadata = await sock.groupMetadata(anu.id)
    const participants = anu.participants
    const memberCount = metadata.participants.length

    for (let num of participants) {
      const user = num.split("@")[0]

      // ======================
      // WELCOME
      // ======================
      if (anu.action === "add") {
        const teks = `
╭─❖「 *WELCOME* 」❖
│ 👤 @${user}
│ 📌 Grup: ${metadata.subject}
│ 👥 Member ke: ${memberCount}
│ 🎉 Selamat datang!
│
│ Jangan lupa patuhi rules ya 😉
╰───────────────
        `.trim()

        await sock.sendMessage(anu.id, {
          text: teks,
          mentions: [num]
        })
      }

      // ======================
      // GOODBYE
      // ======================
      if (anu.action === "remove") {
        const teks = `
╭─❖「 *GOODBYE* 」❖
│ 👤 @${user}
│ 📌 ${metadata.subject}
│ 👥 Sisa member: ${memberCount}
│ 😢 Telah keluar dari grup
│
│ Sampai jumpa 👋
╰───────────────
        `.trim()

        await sock.sendMessage(anu.id, {
          text: teks,
          mentions: [num]
        })
      }
    }
  } catch (err) {
    console.log("Error welcome:", err)
  }
}