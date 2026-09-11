import { Container } from "@/components/ui/Container";

export default function ProductLoading() {
  return (
    <main className="py-[clamp(24px,4vw,40px)]">
      <Container>
        <div className="mb-6 h-4 w-52 animate-pulse rounded-full bg-card-image" />
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="aspect-[4/5] w-full animate-pulse rounded-[18px] bg-card-image" />
          <div className="flex flex-col gap-4">
            <div className="h-8 w-2/3 animate-pulse rounded-full bg-card-image" />
            <div className="h-6 w-1/3 animate-pulse rounded-full bg-card-image" />
            <div className="h-24 w-full animate-pulse rounded-[14px] bg-card-image" />
          </div>
        </div>
      </Container>
    </main>
  );
}
