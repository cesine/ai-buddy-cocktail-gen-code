import { Drink } from "@/types";

const API_BASE_URL = "https://www.thecocktaildb.com/api/json/v1/1";

export interface APIResponse {
  drinks: Drink[] | null;
}

export async function getCocktailListBasedOnIngredients(
  ingredients: string[],
): Promise<Drink[]> {
  if (!ingredients.length) {
    return [];
  }
  try {
    const drinks =
      ingredients.length === 1
        ? await searchByIngredient(ingredients[0])
        : await searchByMultipleIngredients(ingredients);

  // Remove duplicates based on idDrink
  const uniqueDrinks = Array.from(
    new Map(drinks.map((drink) => [drink.idDrink, drink])).values(),
  );

    return uniqueDrinks;
  } catch (error) {
    console.error("Error fetching cocktails:", error);
    return [];
  }
  return [];
}

export async function searchByIngredient(ingredient: string): Promise<Drink[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/filter.php?i=${encodeURIComponent(ingredient)}`,
    );
    console.log('response', response)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: APIResponse = await response.json();
    return data.drinks || [];
  } catch (error) {
    console.error(`Error fetching drinks for ${ingredient}:`, error);
    return [];
  }
}

export async function searchByMultipleIngredients(
  ingredients: string[],
): Promise<Drink[]> {
  try {
    const responses = await Promise.all(
      ingredients.map((ingredient) => searchByIngredient(ingredient)),
    );
    console.log('responses', responses)
    const drinkIdsInResponses = [];
    for (let i = 0; i < ingredients.length; i++) {
      drinkIdsInResponses[i] = responses[i].map((drink) => drink.idDrink);
    }
    console.log('drinkIdsInResponses', drinkIdsInResponses);

    const intersection: string[] = [];
    for (let i = 0; i < drinkIdsInResponses[0].length; i++) {
      const drinkId: string = drinkIdsInResponses[0][i];
      if (drinkIdsInResponses.every((ids) => ids.includes(drinkId))) {
        intersection.push(drinkId);
      }
    }

    console.log('intersection of drinks which contain both ingredients', intersection);
    const results = responses.flat().filter((drink, index, self) =>
      intersection.includes(drink.idDrink) && index === self.findIndex((d) => d.idDrink === drink.idDrink)
    );
    console.log('results  ', results)
    return results;
  } catch (error) {
    console.error("Error fetching multiple ingredients:", error);
    return [];
  }
}

export async function getCocktailRecipe(idDrink: string): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/lookup.php?i=${idDrink}`);
    const data: APIResponse = await response.json();
    const drink = data.drinks?.[0];

    if (!drink) {
      return "";
    }

    // Get all ingredients and their measurements
    const ingredients: string[] = [];
    // from the API ingredients are stored in strIngredient1, strIngredient2, ..., strIngredient15
    for (let i = 1; i <= 15; i++) {
      const ingredient = drink[`strIngredient${i}`];
      const measure = drink[`strMeasure${i}`];

      if (ingredient) {
        const formattedMeasure = measure ? measure.trim() : "";
        const formattedIngredient = ingredient.trim();
        ingredients.push(
          formattedMeasure
            ? `${formattedMeasure} ${formattedIngredient}`
            : formattedIngredient,
        );
      }
    }

    // Format the recipe
    const recipe = [
      "Ingredients:",
      ...ingredients.map((ing) => `- ${ing}`),
      "",
      "Instructions:",
      drink.strInstructions,
    ].join("\n");

    return recipe;
  } catch (error) {
    console.error(`Error fetching cocktail recipe for ${idDrink}:`, error);
    return "";
  }
  // return "";
}
