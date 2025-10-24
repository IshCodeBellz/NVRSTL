import { ShopCategoryClient } from "@/components/shop/ShopCategoryClient";

export default function NBAPage() {
  return (
    <ShopCategoryClient 
      categorySlug="shop/nba"
      fallbackContent={{
        title: "NBA",
        description: "Official NBA team jerseys, player gear, and accessories from your favorite basketball teams and stars.",
        cards: [
          {
            title: "Team Jerseys",
            description: "Authentic NBA team jerseys and uniforms.",
            href: "/shop/nba/team-jerseys"
          },
          {
            title: "Player Gear",
            description: "Signature merchandise from NBA superstars.",
            href: "/shop/nba/player-gear"
          },
          {
            title: "Accessories",
            description: "NBA branded accessories and collectibles.",
            href: "/shop/nba/accessories"
          }
        ]
      }}
    />
  );
}