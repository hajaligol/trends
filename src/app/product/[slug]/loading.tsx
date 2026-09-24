import { Container } from "@/components/ui/Container";

export default function ProductLoading() {
  return (
    <main className="py-[clamp(24px,4vw,40px)]">
      <Container>
        <div className="mb-6 h-4 w-52 animate-pulse rounded-full bg-card-image" />
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
          <div className="aspect-[4/5] w-full animate-pulse rounded-[var(--radius-lg)] bg-card-image" />
          <div className="flex flex-col gap-5">
            <div className="h-4 w-24 animate-pulse rounded-full bg-card-image" />
            <div className="h-9 w-2/3 animate-pulse rounded-full bg-card-image" />
            <div className="h-16 w-full animate-pulse rounded-[var(--radius-md)] bg-card-image" />
            <div className="h-9 w-1/3 animate-pulse rounded-full bg-card-image" />
            <div className="flex gap-2">
              <div className="h-11 w-11 animate-pulse rounded-full bg-card-image" />
              <div className="h-11 w-11 animate-pulse rounded-full bg-card-image" />
              <div className="h-11 w-11 animate-pulse rounded-full bg-card-image" />
            </div>
            <div className="h-[52px] w-full animate-pulse rounded-full bg-card-image" />
          </div>
        </div>
        <div className="mt-14 border-t border-line pt-10">
          <div className="h-13 w-72 max-w-full animate-pulse rounded-full bg-card-image" />
          <div className="mt-6 h-56 w-full animate-pulse rounded-[var(--radius-lg)] bg-card-image" />
        </div>
      </Container>
    </main>
  );
}
