import axios from "axios";

/**
 * Fetch a likely common/local species name from Wikipedia summary endpoint.
 * Returns null when no useful alias is found.
 */
export async function getWikipediaName(scientificName) {
    if (!scientificName || typeof scientificName !== "string") {
        return null;
    }

    try {
        const title = encodeURIComponent(scientificName.trim().replace(/\s+/g, "_"));
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`;

        const response = await axios.get(url, {
            timeout: 8000,
            headers: {
                Accept: "application/json",
                "User-Agent": "BioSentinel/1.0 (species-name-resolver)"
            }
        });

        const data = response.data || {};

        if (typeof data.title === "string" && data.title.trim()) {
            const candidate = data.title.trim();

            if (candidate.toLowerCase() !== scientificName.trim().toLowerCase()) {
                return candidate;
            }
        }

        return null;
    } catch (error) {
        return null;
    }
}
