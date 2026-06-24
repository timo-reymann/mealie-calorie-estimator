export interface MealieIngredient {
  quantity: number | null
  unit: MealieUnit | null
  food: MealieFood | null
  note: string | null
  display: string
  title: string | null
  originalText: string | null
  referenceId?: string | null
}

export interface MealieUnit {
  id: string
  name: string
  pluralName: string | null
  abbreviation: string | null
  standardQuantity: number | null
  standardUnit: string | null
}

export interface MealieFood {
  id: string
  name: string
  pluralName: string | null
  aliases: string[]
}

export interface MealieNutrition {
  calories: string | null
  carbohydrateContent: string | null
  cholesterolContent: string | null
  fatContent: string | null
  fiberContent: string | null
  proteinContent: string | null
  saturatedFatContent: string | null
  sodiumContent: string | null
  sugarContent: string | null
  transFatContent: string | null
  unsaturatedFatContent: string | null
}

export interface MealieTag {
  id: string
  name: string
  slug: string
  groupId: string | null
}

export interface MealieRecipe {
  slug: string
  name: string
  recipeYield: string | null
  recipeServings: number | null
  recipeIngredient: MealieIngredient[]
  nutrition: MealieNutrition | null
  tags: MealieTag[] | null
  extras: Record<string, string> | null
  householdId?: string | null
  household_id?: string | null
}

export interface MealieRecipePatch {
  nutrition?: Partial<MealieNutrition>
  extras?: Record<string, string>
  tags?: MealieTag[]
}

export interface OffSearchResult {
  hits: OffProduct[]
  count?: number
  page?: number
  page_count?: number
  page_size?: number
}

export interface OffProduct {
  product_name: string
  nutriments?: OffNutriments
  nutriscore_grade?: string
}

export interface OffNutriments {
  "energy-kcal_100g": number | null
  "proteins_100g": number | null
  "carbohydrates_100g": number | null
  "fat_100g": number | null
  "saturated-fat_100g": number | null
  "trans-fat_100g": number | null
  "fiber_100g": number | null
  "sugars_100g": number | null
  "sodium_100g": number | null
  "cholesterol_100g": number | null
}

export interface AppriseWebhookPayload {
  title: string
  body: string
  event_type: string
  document_data?: string
  event_id?: string
  timestamp?: string
}

export interface EventRecipeData {
  document_type: string
  documentType?: string
  operation: string
  recipe_slug: string
  recipeSlug?: string
}

export interface NutrientSet {
  kcalPer100g: number | null
  proteinPer100g: number | null
  carbsPer100g: number | null
  fatPer100g: number | null
  saturatedFatPer100g: number | null
  transFatPer100g: number | null
  unsaturatedFatPer100g: number | null
  fiberPer100g: number | null
  sugarPer100g: number | null
  sodiumPer100g: number | null
  cholesterolPer100g: number | null
}

export interface IngredientMatch {
  name: string
  grams: number | null
  matched: boolean
  nutrients: NutrientSet | null
  llmEstimated?: boolean
}

export interface EstimateResult {
  slug: string
  servings: number | null
  totalNutrients: NutrientSet
  perServingNutrients: NutrientSet
  matchedCount: number
  unmatchedCount: number
  unmatchedIngredients: string[]
  matchedIngredients: IngredientMatch[]
}

export interface NutritionPatch {
  nutrition: Partial<MealieNutrition>
  extras: Record<string, string>
}
