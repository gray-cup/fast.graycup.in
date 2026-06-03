import { products } from "@/lib/products";
import ProductCard from "@/components/ProductCard";

export default function HomePage() {
  return (
    <section className="py-14 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...products].sort((a, b) => (a.outOfStock ? 1 : 0) - (b.outOfStock ? 1 : 0)).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
