import axios from "axios";
import fs from "fs";
import path from "path";

const url = "https://api.gbif.org/v1/occurrence/search";

async function downloadDataset() {
    try {
        const response = await axios.get(url, {
            params: {
                country: "IN",
                hasCoordinate: true,
                limit: 300
            }
        });

        const data = response.data.results;

        const filePath = path.join("data", "species_dataset.json");

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        console.log("Dataset saved successfully!");
    } catch (error) {
        console.error("Error downloading dataset:", error);
    }
}

downloadDataset();