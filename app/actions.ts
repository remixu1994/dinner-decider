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
  switchActiveMode,
  toggleMenuItemChefApproval,
  submitDishFeedback,
} from "@/lib/data";
import {
  type ActionFormState,
} from "@/lib/action-state";
import type { ActiveMode } from "@/lib/session";
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
      return errorState("当前模式下不能提交想法。");
    }

    revalidatePath("/family");
    return successState("已保存，并追加到今天的想吃清单。");
  } catch {
    return errorState("保存想法失败，请稍后重试。");
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
      return errorState("当前模式下不能采用推荐菜单。");
    }

    revalidatePath("/family");
    return successState("已采用这套菜单。");
  } catch {
    return errorState("采用推荐菜单失败，请稍后重试。");
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
      return errorState("当前模式下不能添加这道菜。");
    }

    revalidatePath("/family");
    return successState("已加入今晚菜单。");
  } catch {
    return errorState("添加菜品失败，请稍后重试。");
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
      return errorState("请填写菜名，或切换到厨师模式再提交。");
    }

    revalidatePath("/family");
    return successState("已添加到今晚菜单。");
  } catch {
    return errorState("添加自定义菜失败，请稍后重试。");
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
      return errorState("当前模式下不能删除菜品。");
    }

    revalidatePath("/family");
    return successState("已从今晚菜单移除。");
  } catch {
    return errorState("删除菜品失败，请稍后重试。");
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
      return errorState("请先添加菜单内容，再确认今晚菜单。");
    }

    revalidatePath("/family");
    revalidatePath("/history");
    return successState("今晚菜单已确认。");
  } catch {
    return errorState("确认今晚菜单失败，请稍后重试。");
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
      return errorState("反馈内容不完整，暂时无法提交。");
    }

    revalidatePath("/family");
    revalidatePath("/history");
    return successState("晚餐反馈已保存。");
  } catch {
    return errorState("提交反馈失败，请稍后重试。");
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
      return errorState("当前模式下不能审批成员。");
    }

    revalidatePath("/family");
    revalidatePath("/settings");
    return successState("已通过成员加入申请。");
  } catch {
    return errorState("审批失败，请稍后重试。");
  }
}

export async function switchActiveModeAction(
  prevStateOrFormData: ActionFormState | FormData,
  maybeFormData?: FormData,
) {
  const formData = getActionFormData(prevStateOrFormData, maybeFormData);

  if (!formData) {
    return errorState("切换工作模式失败。");
  }

  const mode = String(formData.get("mode") ?? "DINER");
  const nextMode: ActiveMode = mode === "CHEF" ? "CHEF" : "DINER";

  try {
    const ok = await switchActiveMode(nextMode);

    if (!ok) {
      return errorState("切换工作模式失败。");
    }

    revalidatePath("/family");
    return successState(nextMode === "CHEF" ? "已切换为厨师模式。" : "已切换为干饭人模式。");
  } catch {
    return errorState("切换工作模式失败。");
  }
}

export async function toggleMenuItemChefApprovalAction(
  prevStateOrFormData: ActionFormState | FormData,
  maybeFormData?: FormData,
) {
  const formData = getActionFormData(prevStateOrFormData, maybeFormData);

  if (!formData) {
    return errorState("更新厨师同意状态失败。");
  }

  try {
    const ok = await toggleMenuItemChefApproval(String(formData.get("menuItemId") ?? ""));

    if (!ok) {
      return errorState("当前模式下不能更新厨师同意状态。");
    }

    revalidatePath("/family");
    return successState("已更新厨师同意状态。");
  } catch {
    return errorState("更新厨师同意状态失败，请稍后重试。");
  }
}

export async function switchFamilyAction() {
  await leaveCurrentFamilySession();
  redirect("/");
}
