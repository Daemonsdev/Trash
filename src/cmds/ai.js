const axios = require('axios');

module.exports = {
    config: {
        name: "ai",
        description: "Interact with AI",
        usage: "ai [question]",
        cooldown: 3,
        role: 0,
        prefix: false
    },
    run: async (api, event, args, reply, react) => {
        const query = args.join(' ');

        if (!query) {
            react("⚠️", event);
            return reply(global.formatFont("Please provide a query."), event);
        }

        react("⏳", event);

        try {
            const response = await axios.get("https://tools.betabotz.eu.org/tools/openai", {
                params: { q: query },
            });

            const result = response.data.result;
            const responseString = result || global.formatFont("No result found.");

            const formattedResponse = `
🤖 | ChatGpt-4o 
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
