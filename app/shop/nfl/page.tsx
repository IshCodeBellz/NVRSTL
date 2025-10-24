import { ShopCategoryClient } from "@/components/shop/ShopCategoryClient";

export default function NFLPage() {
  return (
    <ShopCategoryClient
      categorySlug="shop/nfl"
      fallbackContent={{
        title: "NFL",
        description:
          "Authentic NFL team jerseys, player merchandise, and Super Bowl gear from all 32 teams.",
        cards: [
          {
            title: "Team Jerseys",
            description: "Official NFL team jerseys from all 32 franchises.",
            href: "/shop/nfl/team-jerseys",
          },
          {
            title: "Player Gear",
            description: "Merchandise featuring your favorite NFL players.",
            href: "/shop/nfl/player-gear",
          },
          {
            title: "Super Bowl",
            description: "Championship merchandise and memorabilia.",
            href: "/shop/nfl/super-bowl",
          },
        ],
      }}
    />
  );
}
