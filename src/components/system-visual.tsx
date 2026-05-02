
import { generateSystemVisualAction, SystemVisualContext } from "@/server/actions/visual-actions";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface SystemVisualProps extends React.HTMLAttributes<HTMLDivElement> {
  module: SystemVisualContext['module'];
  user_role: SystemVisualContext['user_role'];
  intent: SystemVisualContext['intent'];
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
}

export default async function SystemVisual({ module, user_role, intent, className, ...props }: SystemVisualProps) {
  
  const result = await generateSystemVisualAction({
    platform: 'StudYear',
    module,
    user_role,
    intent,
  });

  if (!result.success || !result.imageUrl) {
    // Fallback to a simple div to maintain layout
    return <div className={cn("w-full h-full bg-muted", className)}></div>;
  }

  return (
    <Image
      src={result.imageUrl}
      alt={`${intent} visual for ${module} module`}
      className={className}
      // Pass through the next/image props
      width={props.fill ? undefined : props.width}
      height={props.fill ? undefined : props.height}
      fill={props.fill}
      priority={props.priority}
    />
  );
}
