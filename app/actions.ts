"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ActionFormState } from "@/lib/action-state";
import {
  addManualDish,
  addRecipeToCurrentMenu,
  adoptRecommendation,
  approvePendingMember,
  createFamilyActionData,
  joinFamilyActionData,
  leaveCurrentFamilySession,
  leaveUserSession,
  publishCurrentMenu,
  removeMenuDish,
  savePresetMenu,
  saveDinnerRequest,
  selectFamilyActionData,
  signInWithUserCodeActionData,
  switchMemberHomeView,
  submitDishFeedback,
  toggleMenuItemChefApproval,
} from "@/lib/data";
import { setSession } from "@/lib/session";

function successState(message: string): ActionFormState {
  return {
    status: "success",
    message,
    nonce: Date.now(),
  };
}

function errorState(message: string): ActionFormState {
  return {
    status: "error",
    message,
    nonce: Date.now(),
  };
}

function getActionFormData(
  maybeStateOrFormData: ActionFormState | FormData,
  maybeFormData?: FormData,
) {
  return maybeStateOrFormData instanceof FormData ? maybeStateOrFormData : maybeFormData;
}

function revalidateFamilyViews() {
  revalidatePath("/families");
  revalidatePath("/family");
  revalidatePath("/chef");
  revalidatePath("/history");
  revalidatePath("/settings");
}

export async function signInWithUserCodeAction(formData: FormData) {
  const launch = await signInWithUserCodeActionData(formData);
  await setSession(launch.session);
  redirect(launch.landingPath);
}

export async function createFamilyAction(formData: FormData) {
  const launch = await createFamilyActionData(formData);
  await setSession(launch.session);
  redirect(launch.landingPath);
}

export async function joinFamilyAction(formData: FormData) {
  const launch = await joinFamilyActionData(formData);
  await setSession(launch.session);
  redirect(launch.landingPath);
}

export async function enterFamilyAction(formData: FormData) {
  const launch = await selectFamilyActionData(formData);
  await setSession(launch.session);
  redirect(launch.landingPath);
}

export async function submitDinnerRequestAction(
  prevStateOrFormData: ActionFormState | FormData,
  maybeFormData?: FormData,
) {
  const formData = getActionFormData(prevStateOrFormData, maybeFormData);

  if (!formData) {
    return errorState("提交内容为空。");
  }

  try {
    const ok = await saveDinnerRequest(formData);

    if (!ok) {
      return errorState("当前状态下还不能提交今晚想法。");
    }

    revalidateFamilyViews();
    return successState("今晚想吃什么已经记下了。");
  } catch {
    return errorState("保存失败，请稍后再试。");
  }
}

export async function adoptRecommendationAction(
  prevStateOrFormData: ActionFormState | FormData,
  maybeFormData?: FormData,
) {
  const formData = getActionFormData(prevStateOrFormData, maybeFormData);

  if (!formData) {
    return errorState("提交内容为空。");
  }

  try {
    const ok = await adoptRecommendation(String(formData.get("recipeIds") ?? ""));

    if (!ok) {
      return errorState("当前还不能直接采用推荐方案。");
    }

    revalidateFamilyViews();
    return successState("这套推荐已经放进今晚菜单。");
  } catch {
    return errorState("采用推荐失败，请稍后再试。");
  }
}

export async function addRecipeToMenuAction(
  prevStateOrFormData: ActionFormState | FormData,
  maybeFormData?: FormData,
) {
  const formData = getActionFormData(prevStateOrFormData, maybeFormData);

  if (!formData) {
    return errorState("提交内容为空。");
  }

  try {
    const ok = await addRecipeToCurrentMenu(String(formData.get("recipeId") ?? ""));

    if (!ok) {
      return errorState("当前还不能加这道菜。");
    }

    revalidateFamilyViews();
    return successState("已经加入今晚菜单。");
  } catch {
    return errorState("加菜失败，请稍后再试。");
  }
}

export async function addManualDishAction(
  prevStateOrFormData: ActionFormState | FormData,
  maybeFormData?: FormData,
) {
  const formData = getActionFormData(prevStateOrFormData, maybeFormData);

  if (!formData) {
    return errorState("提交内容为空。");
  }

  try {
    const ok = await addManualDish(formData);

    if (!ok) {
      return errorState("请先补全菜名，或确认你有菜单编辑权限。");
    }

    revalidateFamilyViews();
    return successState("临时新菜已经加入今晚菜单。");
  } catch {
    return errorState("添加失败，请稍后再试。");
  }
}

export async function removeMenuDishAction(
  prevStateOrFormData: ActionFormState | FormData,
  maybeFormData?: FormData,
) {
  const formData = getActionFormData(prevStateOrFormData, maybeFormData);

  if (!formData) {
    return errorState("提交内容为空。");
  }

  try {
    const ok = await removeMenuDish(String(formData.get("menuItemId") ?? ""));

    if (!ok) {
      return errorState("当前还不能移除这道菜。");
    }

    revalidateFamilyViews();
    return successState("已经从今晚菜单移除。");
  } catch {
    return errorState("删除失败，请稍后再试。");
  }
}

export async function publishMenuAction(
  prevStateOrFormData: ActionFormState | FormData,
  maybeFormData?: FormData,
) {
  void prevStateOrFormData;
  void maybeFormData;

  try {
    const ok = await publishCurrentMenu();

    if (!ok) {
      return errorState("请先确认今晚菜单里至少有一道菜。");
    }

    revalidateFamilyViews();
    return successState("今晚菜单已经确认发布。");
  } catch {
    return errorState("确认菜单失败，请稍后再试。");
  }
}

export async function savePresetMenuAction(
  prevStateOrFormData: ActionFormState | FormData,
  maybeFormData?: FormData,
) {
  void prevStateOrFormData;
  void maybeFormData;

  try {
    const ok = await savePresetMenu();

    if (!ok) {
      return errorState("请先确认今晚菜单里至少有一道菜，再保存为预设菜单。");
    }

    revalidateFamilyViews();
    return successState("这版菜单已经保存为今晚预设，干饭人现在可以先参考。");
  } catch {
    return errorState("保存预设菜单失败，请稍后再试。");
  }
}

export async function submitFeedbackAction(
  prevStateOrFormData: ActionFormState | FormData,
  maybeFormData?: FormData,
) {
  const formData = getActionFormData(prevStateOrFormData, maybeFormData);

  if (!formData) {
    return errorState("提交内容为空。");
  }

  try {
    const ok = await submitDishFeedback(formData);

    if (!ok) {
      return errorState("反馈内容还不完整。");
    }

    revalidateFamilyViews();
    return successState("晚餐反馈已保存。");
  } catch {
    return errorState("提交反馈失败，请稍后再试。");
  }
}

export async function approveMemberAction(
  prevStateOrFormData: ActionFormState | FormData,
  maybeFormData?: FormData,
) {
  const formData = getActionFormData(prevStateOrFormData, maybeFormData);

  if (!formData) {
    return errorState("提交内容为空。");
  }

  try {
    const ok = await approvePendingMember(String(formData.get("memberId") ?? ""));

    if (!ok) {
      return errorState("当前没有权限处理成员审核。");
    }

    revalidateFamilyViews();
    return successState("成员已通过加入审核。");
  } catch {
    return errorState("审核失败，请稍后再试。");
  }
}

export async function toggleMenuItemChefApprovalAction(
  prevStateOrFormData: ActionFormState | FormData,
  maybeFormData?: FormData,
) {
  const formData = getActionFormData(prevStateOrFormData, maybeFormData);

  if (!formData) {
    return errorState("提交内容为空。");
  }

  try {
    const ok = await toggleMenuItemChefApproval(String(formData.get("menuItemId") ?? ""));

    if (!ok) {
      return errorState("当前还不能更新这道菜的确认状态。");
    }

    revalidateFamilyViews();
    return successState("厨师确认状态已更新。");
  } catch {
    return errorState("更新失败，请稍后再试。");
  }
}

export async function switchFamilyAction() {
  await leaveCurrentFamilySession();
  redirect("/families");
}

export async function switchToChefViewAction() {
  const landingPath = await switchMemberHomeView("CHEF");
  revalidateFamilyViews();
  redirect(landingPath ?? "/family");
}

export async function switchToFamilyViewAction() {
  const landingPath = await switchMemberHomeView("FAMILY");
  revalidateFamilyViews();
  redirect(landingPath ?? "/family");
}

export async function useDifferentUserCodeAction() {
  await leaveUserSession();
  redirect("/");
}
