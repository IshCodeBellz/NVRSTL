import { ShopCategoryClient } from "@/components/shop/ShopCategoryClient";

export default function FootballPage() {
  return (
    <ShopCategoryClient 
      categorySlug="shop/football"
      fallbackContent={{
        title: "FOOTBALL",
        description: "Premier League, La Liga, Serie A and more. Official jerseys and merchandise from the world's top football leagues.",
        cards: [
          {
            title: "Premier League",
            description: "England's top football league with teams like Manchester United, Liverpool, Arsenal, and Chelsea.",
            href: "/shop/football/premier-league"
          },
          {
            title: "La Liga",
            description: "Spain's premier football league featuring Real Madrid, Barcelona, and other top Spanish clubs.",
            href: "/shop/football/la-liga"
          },
          {
            title: "Serie A",
            description: "Italy's top football league with Juventus, AC Milan, Inter Milan, and other legendary clubs.",
            href: "/shop/football/serie-a"
          }
        ]
      }}
    />
  );
}
