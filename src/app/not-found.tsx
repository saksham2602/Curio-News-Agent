import Link from "next/link";
import { Container, EmptyState } from "@/components/ui";
import { Magnifier } from "@/components/doodles";

export default function NotFound() {
  return (
    <Container className="pt-16">
      <EmptyState doodle={<Magnifier className="h-14 w-14" />} title="We looked everywhere" description="That page or story isn't here. Older stories are pruned after 45 days unless you saved them." action={<Link href="/" className="rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-paper">Back to Today</Link>} />
    </Container>
  );
}
