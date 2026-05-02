
import { Rocket } from "lucide-react";
import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary">
      <div className="bg-primary text-primary-foreground p-2 rounded-md">
        <Rocket className="w-5 h-5" />
      </div>
      <span className="group-data-[collapsible=icon]:hidden">StudYear</span>
    </Link>
  );
}
