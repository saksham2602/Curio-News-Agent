import Image from "next/image";
import { subjectMeta } from "@/lib/taxonomy";
import { SUBJECT_DOODLES } from "@/components/doodles";
import { cn } from "@/lib/utils";

// Publisher image when available; otherwise an editorial tinted illustration for the subject.
export function StoryImage({ story, className, sizes, priority, small }: { story: { title: string; subject: string; imageUrl: string | null }; className?: string; sizes?: string; priority?: boolean; small?: boolean }) {
  const meta = subjectMeta(story.subject);
  const Doodle = SUBJECT_DOODLES[meta.doodle];
  if (story.imageUrl) {
    return (
      <div className={cn("relative overflow-hidden bg-line/50", className)}>
        <Image src={story.imageUrl} alt="" fill sizes={sizes ?? "100vw"} priority={priority} className="object-cover" unoptimized />
      </div>
    );
  }
  return (
    <div className={cn("grain flex items-center justify-center overflow-hidden", meta.tint, className)} aria-hidden>
      <Doodle className={cn("text-ink/80", small ? "h-10 w-10" : "h-16 w-16")} />
    </div>
  );
}
