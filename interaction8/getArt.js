// this function queries the art institute of chicago's API 
// and returns an array of response data

export function getArt(query, numResponses) {
  return new Promise((resolve, reject) => {
    let url =
      "https://api.artic.edu/api/v1/artworks/search?q=" +
      query +
      "&query[term][is_public_domain]=true&limit=" + numResponses;
    

    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        console.log(json);
        let data = json.data;
        let promises = []; // Array to store promises
        for (let i = 0; i < data.length; i++) {
          let itemInfoUrl = data[i].api_link;
          // Push each fetch call's promise into the promises array
          promises.push(
            fetch(itemInfoUrl)
              .then((res) => res.json())
              .then((info) => {
                let image_id = info.data.image_id;
                let imageUrl =
                  "https://www.artic.edu/iiif/2/" +
                  image_id +
                  "/full/843,/0/default.jpg";
                const artInfo = {
                  imageUrl: imageUrl,
                  title: info.data.title,
                  artist: info.data.artist_title,
                  description: info.data.description,
                };

                return artInfo;
              })
          );
        }
        // Wait for all promises to resolve
        Promise.all(promises)
          .then((info) => {
            // Now you have all the image URLs
            resolve(info);
          })
          .catch((error) => {
            reject(error);
          });
      })
      .catch((error) => {
        reject(error);
      });
  });
}
