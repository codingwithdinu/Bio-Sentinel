import axios from "axios";

export async function getWikipediaName(scientificName) {
  try {

    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${scientificName}`;

    const res = await axios.get(url);

    if (res.data && res.data.title) {
      return res.data.title;
    }

    return null;

  } catch (err) {
    return null;
  }
}