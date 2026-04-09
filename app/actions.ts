"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addManualDish,
  addRecipeToCurrentMenu,
  adoptRecommendation,
  approvePendingMember,
  createFamilyActionData,
  joinFamilyActionData,
  leaveCurrentFamilySession,
  publishCurrentMenu,
  removeMenuDish,
  saveDinnerRequest,
  submitDishFeedback,
} from "@/lib/data";
import { setSession } from "@/lib/session";

export async function createFamilyAction(formData: FormData) {
  const session = await createFamilyActionData(formData);
  await setSession(session);
  redirect("/family");
}

export async function joinFamilyAction(formData: FormData) {
  const session = await joinFamilyActionData(formData);
  await setSession(session);
  redirect("/family");
}

export async function submitDinnerRequestAction(formData: FormData) {
  await saveDinnerRequest(formData);
  revalidatePath("/family");
}

export async function adoptRecommendationAction(formData: FormData) {
  await adoptRecommendation(String(formData.get("recipeIds") ?? ""));
  revalidatePath("/family");
}

export async function addRecipeToMenuAction(formData: FormData) {
  await addRecipeToCurrentMenu(String(formData.get("recipeId") ?? ""));
  revalidatePath("/family");
}

export async function addManualDishAction(formData: FormData) {
  await addManualDish(formData);
  revalidatePath("/family");
}

export async function removeMenuDishAction(formData: FormData) {
  await removeMenuDish(String(formData.get("menuItemId") ?? ""));
  revalidatePath("/family");
}

export async function publishMenuAction() {
  await publishCurrentMenu();
  revalidatePath("/family");
  revalidatePath("/history");
}

export async function submitFeedbackAction(formData: FormData) {
  await submitDishFeedback(formData);
  revalidatePath("/family");
  revalidatePath("/history");
}

export async function approveMemberAction(formData: FormData) {
  await approvePendingMember(String(formData.get("memberId") ?? ""));
  revalidatePath("/family");
  revalidatePath("/settings");
}

export async function switchFamilyAction() {
  await leaveCurrentFamilySession();
  redirect("/");
}
