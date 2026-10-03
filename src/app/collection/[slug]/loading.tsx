import { Container } from "@/components/ui/Container";

export default function CollectionLoading() {
  return (
    <main className="py-[clamp(24px,4vw,40px)]">
      <Container>
        <div className="mb-6 h-4 w-40 animate-pulse rounded-full bg-card-image" />
        <div className="mb-8 h-9 w-56 animate-pulse rounded-full bg-card-image" />
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="flex flex-col gap-2.5">
              <div className="aspect-[3/4] animate-pulse rounded-[14px] bg-card-image" />
              <div className="h-3.5 w-3/4 animate-pulse rounded-full bg-card-image" />
              <div className="h-3.5 w-1/2 animate-pulse rounded-full bg-card-image" />
            </div>
          ))}
        </div>
      </Container>
    </main>
  );
}
