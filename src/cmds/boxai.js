const axios = require('axios');

module.exports = {
    config: {
        name: "boxai",
        description: "Interact with Blackbox AI",
        usage: "blackbox [question]",
        cooldown: 3,
        role: 0,
        prefix: false
    },
    run: async (api, event, args, reply, react) => {
        const prompt = args.join(' ');

        if (!prompt) {
            react("⚠️", event);
            return reply(global.formatFont("Please provide a question."), event);
        }

        react("⏳", event);

        try {
            const response = await axios.get("https://deku-rest-api.gleeze.com/blackbox", {
                params: { prompt: prompt },
            });

            const result = response.data;
            const responseString = result?.data || global.formatFont("No result found.");

            const formattedResponse = `
📦 | BLACKBOX AI
━━━━━━━━━━━━━━━━━━
${responseString}
━━━━━━━━━━━━━━━━━━
◉ 𝙷𝚎𝚛𝚞 𝙱𝚘𝚝
            `;

            react("✅", event);
            reply(global.formatFont(formattedResponse.trim()), event);
        } catch (error) {
            react("⚠️", event);
            reply(global.formatFont("❌ Error fetching response."), event);
        }
    }
};
