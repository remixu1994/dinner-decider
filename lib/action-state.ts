export type ActionFormState = {
  status: "idle" | "success" | "error";
  message: string;
  nonce: number;
};

export const INITIAL_ACTION_STATE: ActionFormState = {
  status: "idle",
  message: "",
  nonce: 0,
};
