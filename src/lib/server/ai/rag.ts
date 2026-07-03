import { Grocery } from "@/models/grocery.model";
import { Category } from "@/models/category.model";
import "@/models/groceryVariant.model"; // Ensure variant model registration
import { getGatewayEmbeddings } from "./gateway";

export const SYNONYMS: Record<string, string[]> = {
  "sex": ["condom", "manforce", "intimacy", "contraceptive", "wellness"],
  "sexual": ["condom", "manforce", "intimacy", "contraceptive", "wellness"],
  "condom": ["manforce", "condoms", "intimacy"],
  "condoms": ["manforce", "condom", "intimacy"],
  "doodh": ["milk", "dairy"],
  "dudh": ["milk", "dairy"],
  "anda": ["egg", "eggs"],
  "seb": ["apple", "apples"],
  "dawa": ["medicine", "tablet", "paracetamol", "capsule", "wellness"],
  "medicine": ["tablet", "paracetamol", "capsule", "wellness"],
  "chai": ["tea", "taj mahal", "brooke bond"],
  "oil": ["fortune", "mustard", "refined", "coconut"],
  "atta": ["flour", "aashirwad", "ashirvaad"],
  "fruits": ["fruit", "apple", "apples", "banana", "mango", "orange", "grapes", "vegetables"],
  "fruit": ["fruits", "apple", "apples", "banana", "mango", "orange", "grapes", "vegetables"],
  "vegetables": ["vegetable", "sabzi", "onion", "potato", "tomato", "ginger", "garlic", "fruits"],
  "vegetable": ["vegetables", "sabzi", "onion", "potato", "tomato", "ginger", "garlic", "fruits"],
  "sabzi": ["vegetables", "vegetable", "onion", "potato", "tomato"],
  "grocery": ["groceries", "food", "atta", "oil", "rice", "dal"],
  "groceries": ["grocery", "food", "atta", "oil", "rice", "dal"],
};

export const STOP_WORDS = new Set([
  "what", "is", "your", "the", "a", "an", "and", "or", "but", "to", "for", "of", "in", "on", "at", "by", "with",
  "this", "that", "these", "those", "how", "why", "where", "when", "who", "whom", "which", "are", "you", "me",
  "i", "we", "he", "she", "they", "it", "my", "our", "their", "his", "her", "its", "about", "would", "could",
  "should", "do", "does", "did", "have", "has", "had", "can", "will", "just", "don", "now", "here", "there",
  "about", "please", "query", "policy", "refund", "return", "cancellation", "work"
]);

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanSearchQuery(query: string): string {
  let cleaned = query.toLowerCase();

  const phrasesToRemove = [
    /\bi want to buy\b/g,
    /\bi want\b/g,
    /\bsearch for\b/g,
    /\bshow me\b/g,
    /\bfind me\b/g,
    /\badd to cart\b/g,
    /\badd to my cart\b/g,
    /\badd in my cart\b/g,
    /\badd\b/g,
    /\bplease\b/g,
    /\bkrdo\b/g,
    /\bdena\b/g,
    /\bde do\b/g,
    /\bchahiye\b/g,
    /\bmilga\b/g,
    /\bput\b/g,
    /\binsert\b/g,
    /\bproducts\b/g,
    /\bitems\b/g,
  ];

  for (const regex of phrasesToRemove) {
    cleaned = cleaned.replace(regex, "");
  }

  return cleaned.replace(/\s+/g, " ").trim();
}

export async function generateGeminiEmbedding(text: string): Promise<number[] | null> {
  try {
    const embedding = await getGatewayEmbeddings(text);
    if (embedding && embedding.length > 0) {
      return embedding;
    }
  } catch (error) {
    console.error("Error generating unified gateway embedding:", error);
  }
  return null;
}

export async function searchGroceries(query: string, limit: number = 6) {
  const cleaned = cleanSearchQuery(query);
  const searchString = cleaned || query; // fallback to raw query if cleaned is empty

  // 1. Synonym-expanded keyword regex search
  const keywords = searchString
    .split(/\s+/)
    .map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

  const searchTermsSet = new Set<string>();

  for (const word of keywords) {
    searchTermsSet.add(word);
    const synonyms = SYNONYMS[word];
    if (synonyms) {
      synonyms.forEach((syn) => searchTermsSet.add(syn));
    }
  }

  // If no meaningful product keywords remain, skip search entirely to prevent irrelevant matches
  if (searchTermsSet.size === 0) {
    return [];
  }

  const joinedPattern = Array.from(searchTermsSet)
    .map((term) => escapeRegExp(term))
    .join("|");
  const finalRegex = new RegExp(joinedPattern, "i");

  // Retrieve category IDs matching the regex pattern
  let categoryIds: any[] = [];
  try {
    const matchingCategories = await Category.find({
      name: { $regex: finalRegex },
    }).select("_id").lean();
    categoryIds = matchingCategories.map((c) => c._id);
  } catch (err) {
    console.warn("Failed to lookup categories matching query:", err);
  }

  const orConditions: any[] = [
    { name: { $regex: finalRegex } },
    { description: { $regex: finalRegex } },
    { brand: { $regex: finalRegex } },
  ];

  if (categoryIds.length > 0) {
    orConditions.push({ category: { $in: categoryIds } });
  }

  let keywordResults: any[] = [];
  try {
    keywordResults = await Grocery.find({
      $or: orConditions,
      isActive: true,
    })
      .populate("variants")
      .lean();
  } catch (err) {
    console.error("Keyword search query failed:", err);
  }

  // 2. Vector search (if embedding generation succeeds)
  let vectorResults: any[] = [];
  const embedding = await generateGeminiEmbedding(searchString);
  if (embedding) {
    try {
      // Execute MongoDB Atlas Vector search
      const aggResults = await Grocery.aggregate([
        {
          $vectorSearch: {
            index: "default",
            path: "vectorEmbedding",
            queryVector: embedding,
            numCandidates: 50,
            limit: limit,
          },
        },
        {
          $project: {
            name: 1,
            description: 1,
            brand: 1,
            nutritionalMetrics: 1,
            score: { $meta: "searchScore" },
          },
        },
      ]);

      if (aggResults.length > 0) {
        vectorResults = await Grocery.populate(aggResults, { path: "variants" });
      }
    } catch (vectorError) {
      console.warn("MongoDB Vector Search failed:", vectorError);
    }
  }

  // 3. Merge results (vector results first, then append keyword results)
  const mergedMap = new Map<string, any>();
  
  // Add vector results first
  for (const item of vectorResults) {
    if (item && item._id) {
      mergedMap.set(item._id.toString(), item);
    }
  }

  // Append keyword results
  for (const item of keywordResults) {
    if (item && item._id) {
      const idStr = item._id.toString();
      if (!mergedMap.has(idStr)) {
        mergedMap.set(idStr, item);
      }
    }
  }

  return Array.from(mergedMap.values()).slice(0, limit);
}
