import http from "node:http"

const products = {
  "weizenmehl": { name: "Weizenmehl", kcal: 364, protein: 10.3, carbs: 76.3, fat: 1.0, satFat: 0.2, transFat: 0, fiber: 2.7, sugar: 0.4, sodium: 0.002, cholesterol: 0 },
  "mehl":       { name: "Mehl", kcal: 364, protein: 10.3, carbs: 76.3, fat: 1.0, satFat: 0.2, transFat: 0, fiber: 2.7, sugar: 0.4, sodium: 0.002, cholesterol: 0 },
  "emmentaler": { name: "Emmentaler", kcal: 380, protein: 27, carbs: 0, fat: 30, satFat: 19, transFat: 1.2, fiber: 0, sugar: 0, sodium: 0.6, cholesterol: 0.1 },
  "eier":       { name: "Ei", kcal: 155, protein: 13, carbs: 1.1, fat: 11, satFat: 3.3, transFat: 0, fiber: 0, sugar: 0.3, sodium: 0.14, cholesterol: 0.373 },
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost")
  const query = (url.searchParams.get("search_terms") || "").toLowerCase().trim()
  const product = products[query]

  res.writeHead(200, { "Content-Type": "application/json" })

  if (!product) {
    res.end(JSON.stringify({ count: 0, products: [] }))
    return
  }

  res.end(JSON.stringify({
    count: 1,
    products: [{
      product_name: product.name,
      nutriments: {
        "energy-kcal_100g": product.kcal,
        "proteins_100g": product.protein,
        "carbohydrates_100g": product.carbs,
        "fat_100g": product.fat,
        "saturated-fat_100g": product.satFat,
        "trans-fat_100g": product.transFat,
        "fiber_100g": product.fiber,
        "sugars_100g": product.sugar,
        "sodium_100g": product.sodium,
        "cholesterol_100g": product.cholesterol,
      },
    }],
  }))
})

server.listen(3000, "0.0.0.0", () => {
  console.log("Mock OFF server listening on port 3000")
})
