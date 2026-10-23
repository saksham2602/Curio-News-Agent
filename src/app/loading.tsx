import { Container, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <Container className="pt-8" aria-busy="true">
      <Skeleton className="h-[320px] w-full rounded-[28px]" />
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </Container>
  );
}
