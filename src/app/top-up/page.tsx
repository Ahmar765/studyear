import { redirect } from "next/navigation";

/** Alias so “Top up” links can use `/top-up`; same checkout experience including ACU packs. */
export default function TopUpRedirectPage() {
  redirect("/checkout");
}
