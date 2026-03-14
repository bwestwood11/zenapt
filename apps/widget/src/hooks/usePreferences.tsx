export interface Preferences {
  side: "right" | "left";
}


export const usePreferences = (): Preferences => {
    // TODO: Fetch pref from api
    return { side: "left" }
}