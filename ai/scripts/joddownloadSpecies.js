import axios from "axios";
import fs from "fs";

async function downloadSpecies() {
  try {

    const response = await axios.get(
      "https://api.gbif.org/v1/occurrence/search",
      {
        params: {
          decimalLatitude: 26.2389,
          decimalLongitude: 73.0243,
          radius: 50,
          hasCoordinate: true,
          limit: 100
        }
      }
    );

    const data = response.data.results;

    fs.writeFileSync(
      "./data/jodhpur_species.json",
      JSON.stringify(data, null, 2)
    );

    console.log("Jodhpur species dataset saved!");

  } catch (error) {
    console.error("Error:", error);
  }
}

downloadSpecies();