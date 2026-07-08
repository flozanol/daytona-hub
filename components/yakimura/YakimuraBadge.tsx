interface YakimuraBadgeProps {
  n: number;
}

export function YakimuraBadge({ n }: YakimuraBadgeProps) {
  if (n > 0) {
    return (
      <span className="inline-block bg-green-700 text-white text-xs font-black px-2.5 py-0.5 rounded-md">
        +{n} COMPRAR
      </span>
    );
  }
  if (n < 0) {
    return (
      <span className="inline-block bg-red-100 text-red-700 text-xs font-black px-2.5 py-0.5 rounded-md">
        {n} SOBRA
      </span>
    );
  }
  return (
    <span className="inline-block bg-gray-200 text-gray-500 text-xs px-2.5 py-0.5 rounded-md">
      ✔ OK
    </span>
  );
}
