import { ShopCategoryClient } from "@/components/shop/ShopCategoryClient";

export default function CustomPage() {
  return (
    <ShopCategoryClient 
      categorySlug="shop/custom"
      fallbackContent={{
        title: "CUSTOM",
        description: "Design your own personalized jerseys, team uniforms, and custom merchandise with your own style.",
        cards: [
          {
            title: "Custom Jerseys",
            description: "Design your own personalized jerseys with custom names and numbers.",
            href: "/shop/custom/jerseys"
          },
          {
            title: "Team Uniforms",
            description: "Create custom team uniforms for your sports team.",
            href: "/shop/custom/team-uniforms"
          },
          {
            title: "Personalized Gear",
            description: "Custom accessories and gear with your own design.",
            href: "/shop/custom/personalized-gear"
          }
        ]
      }}
    />
  );
}