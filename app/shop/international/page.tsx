import { ShopCategoryClient } from "@/components/shop/ShopCategoryClient";

export default function InternationalPage() {
  return (
    <ShopCategoryClient 
      categorySlug="shop/international"
      fallbackContent={{
        title: "INTERNATIONAL",
        description: "World Cup, Champions League, and national teams. Global football culture and international tournaments.",
        cards: [
          {
            title: "World Cup",
            description: "Official FIFA World Cup merchandise and memorabilia.",
            href: "/shop/international/world-cup"
          },
          {
            title: "Champions League",
            description: "European football's premier club competition gear.",
            href: "/shop/international/champions-league"
          },
          {
            title: "National Teams",
            description: "Official jerseys and gear from national football teams.",
            href: "/shop/international/national-teams"
          }
        ]
      }}
    />
  );
}
