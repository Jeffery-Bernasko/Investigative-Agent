/**
 * Search the web via Tavily API and return normalised results.
 */
export async function searchWithTavily(
    query: string,
    apiKey?: string
): Promise<Array<{ title: string; url: string; snippet: string }>> {
    const key = apiKey || process.env.TAVILY_API_KEY;
    if (!key) {
        return [];
    }

    try {
        console.log(`🔍 Tavily search: "${query}"`);
        const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                api_key: key,
                query,
                search_depth: "advanced",
                max_results: 10,
                include_answer: false,
                include_domains: [
                    "github.com",
                    "x.com",
                    "instagram.com",
                    "linkedin.com",
                    "facebook.com",
                    "reddit.com",
                    "medium.com",
                ],
            }),
        });

        if (!response.ok) {
            console.error(`❌ Tavily API error: ${response.status}`);
            return [];
        }

        const data = await response.json();
        const results = (data.results || []).map(
            (r: { title: string; url: string; content: string }) => ({
                title: r.title,
                url: r.url,
                snippet: r.content?.slice(0, 300) || "",
            })
        );

        console.log(`✅ Tavily returned ${results.length} verified results`);
        return results;
    } catch (error: any) {
        console.error(`❌ Tavily error: ${error.message}`);
        return [];
    }
}
