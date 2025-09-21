import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method === "GET") {
        const apiKey = process.env.NEXT_CEREBRAS_API_KEY || "";

        if (!apiKey) {
            return res.status(500).json({
                error: "Something went wrong with loading an API Key",
                message:
                    "Please check whether an environment variable has set correctly.",
            });
        }

        try {
            const response = await fetch(
                "https://api.cerebras.ai/v1/chat/completions",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: "llama-3.3-70b",
                        messages: [
                            {
                                role: "system",
                                content: JSON.stringify({
                                    instruction:
                                        "You are a game content generator for a 'training data minigame'. Your task is to generate 10 scenario prompts, each with 8–12 candidate words and weighted relevance. The goal is to create a mix of high, medium, low, and slightly irrelevant options to challenge the player in selecting the most relevant words for the AI Sidekick.",

                                    rules: [
                                        "Generate exactly 10 prompts, numbered 1 to 10.",
                                        "Each prompt must have a 'prompt_text' (a noun, place, or concept).",
                                        "Each prompt must include 8–12 candidate words (options).",
                                        "Each candidate word must have a 'word' string and a 'weight' between 1 and 10.",
                                        "Distribute weights as follows: 3 high relevance (8–10), 2–3 medium relevance (5–7), 2 low relevance (3–4), 1–2 slightly irrelevant (1–2).",
                                        "Enforce category variety: at most 2 words per category (objects, people/professions, locations, actions, abstract ideas, or related concepts).",
                                        "High relevance words must be core defining elements of the prompt, medium relevance words must be strongly associated but non-essential, low relevance words must be peripheral or situational, and slightly irrelevant words must be weak but plausible.",
                                        "Do not include near-duplicate synonyms (e.g., 'cash' and 'currency').",
                                        "Do not order the options by weight; shuffle them.",
                                        "All words, even slightly irrelevant ones, must be plausibly connected to the prompt.",
                                        "After assigning weights, shuffle the order of all options randomly so that high-relevance, medium, low, and irrelevant words are mixed — never grouped together.",
                                        "Output only valid JSON. No explanations, no extra text.",
                                        "Do NOT hallucinate prompts or words that are completely unrelated or nonsensical.",
                                    ],
                                    output_format: {
                                        prompts: [
                                            {
                                                id: 1,
                                                prompt_text: "bank",
                                                options: [
                                                    {
                                                        word: "cash",
                                                        weight: 10,
                                                    },
                                                    {
                                                        word: "paperclip",
                                                        weight: 1,
                                                    },
                                                    { word: "desk", weight: 4 },
                                                    {
                                                        word: "vault",
                                                        weight: 9,
                                                    },
                                                    {
                                                        word: "teller",
                                                        weight: 7,
                                                    },
                                                    { word: "loan", weight: 6 },
                                                    { word: "car", weight: 3 },
                                                    { word: "tree", weight: 2 },
                                                    {
                                                        word: "security",
                                                        weight: 8,
                                                    },
                                                ],
                                            },
                                        ],
                                    },

                                    fail_cases: [
                                        "Do not generate fewer or more than 10 prompts.",
                                        "Do not generate fewer than 8 or more than 12 options per prompt.",
                                        "Do not include words that are completely irrelevant or absurd.",
                                        "Weights must always be integers between 1 and 10.",
                                        "Do not include extra commentary, explanations, or text outside the JSON structure.",
                                        "Do not leave all words too relevant; include a proper mix of relevance levels.",
                                    ],
                                }),
                            },
                        ],
                        temperature: 0.7,
                    }),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                return res.status(response.status).json({ error: errorText });
            }

            const data = await response.json();
            const message = data.choices?.[0]?.message?.content || null;

            return res.status(200).json({ success: true, message });
        } catch (err: any) {
            return res
                .status(500)
                .json({ error: err.message || "Unknown error" });
        }
    } else {
        return res
            .status(405)
            .json({ error: `Method ${req.method} Not Allowed` });
    }
}

