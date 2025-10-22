"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Star, Quote, Loader2 } from "lucide-react";
import Image from "next/image";

interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  title?: string;
  date: string;
  avatar?: string;
  platform: "trustpilot" | "google";
  verified?: boolean;
}

interface ReviewsResponse {
  success: boolean;
  reviews: Review[];
  platform: "trustpilot" | "google";
  stats: {
    averageRating: number;
    totalReviews: number;
    verifiedPercentage: number;
  };
}

interface ReviewsCarouselProps {
  title?: string;
  subtitle?: string;
}

export function ReviewsCarousel({
  title = "What Our Customers Say",
  subtitle = "Real reviews from real customers",
}: ReviewsCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeTab, setActiveTab] = useState<"trustpilot" | "google">(
    "trustpilot"
  );
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [trustpilotReviews, setTrustpilotReviews] = useState<Review[]>([]);
  const [googleReviews, setGoogleReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    averageRating: 4.8,
    totalCustomers: 12000,
    satisfactionRate: 98,
    supportAvailability: "24/7",
  });

  const reviews =
    activeTab === "trustpilot" ? trustpilotReviews : googleReviews;
  const totalSlides = Math.ceil(reviews.length / 2); // Show 2 reviews per slide

  // Fetch reviews data
  useEffect(() => {
    const fetchReviews = async () => {
      setIsLoading(true);
      try {
        const [trustpilotResponse, googleResponse] = await Promise.all([
          fetch("/api/reviews/trustpilot"),
          fetch("/api/reviews/google"),
        ]);

        if (trustpilotResponse.ok) {
          const trustpilotData: ReviewsResponse =
            await trustpilotResponse.json();
          if (trustpilotData.success) {
            setTrustpilotReviews(trustpilotData.reviews);
          }
        }

        if (googleResponse.ok) {
          const googleData: ReviewsResponse = await googleResponse.json();
          if (googleData.success) {
            setGoogleReviews(googleData.reviews);
            // Update stats with real data
            setStats((prev) => ({
              ...prev,
              averageRating: googleData.stats.averageRating,
              totalCustomers: googleData.stats.totalReviews * 50, // Estimate total customers
              satisfactionRate: googleData.stats.verifiedPercentage,
            }));
          }
        }
      } catch {
        // Handle error silently
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, []);

  useEffect(() => {
    if (!isAutoPlaying || totalSlides <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 5000);

    return () => clearInterval(interval);
  }, [totalSlides, isAutoPlaying]);

  const nextSlide = () => {
    setIsAutoPlaying(false);
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setIsAutoPlaying(false);
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300 dark:text-gray-600"
            }`}
          />
        ))}
      </div>
    );
  };

  const getPlatformLogo = (platform: "trustpilot" | "google") => {
    if (platform === "trustpilot") {
      return (
        <div className="flex items-center gap-2">
          <div className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">
            Trustpilot
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">
          Google
        </div>
      </div>
    );
  };

  return (
    <section className="bg-black py-20">
      <div className="container mx-auto px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white font-carbon mb-6">
            {title}
          </h2>
          <p className="text-lg text-gray-300 font-carbon uppercase tracking-wider">
            {subtitle}
          </p>
        </div>

        {/* Platform Tabs */}
        <div className="flex justify-center mb-16">
          <div className="bg-gray-800 rounded-lg p-1 flex border border-gray-700">
            <button
              onClick={() => {
                setActiveTab("trustpilot");
                setCurrentSlide(0);
                setIsAutoPlaying(true);
              }}
              className={`px-6 py-3 rounded-md text-sm font-bold transition-all font-carbon uppercase tracking-wider ${
                activeTab === "trustpilot"
                  ? "bg-white text-black shadow-lg"
                  : "text-gray-400 hover:text-white"
              }`}
              disabled={isLoading}
            >
              <div className="flex items-center gap-3">
                <div className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold">
                  Trustpilot
                </div>
                <span>Reviews ({trustpilotReviews.length})</span>
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab("google");
                setCurrentSlide(0);
                setIsAutoPlaying(true);
              }}
              className={`px-6 py-3 rounded-md text-sm font-bold transition-all font-carbon uppercase tracking-wider ${
                activeTab === "google"
                  ? "bg-white text-black shadow-lg"
                  : "text-gray-400 hover:text-white"
              }`}
              disabled={isLoading}
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold">
                  Google
                </div>
                <span>Reviews ({googleReviews.length})</span>
              </div>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-300 font-carbon uppercase tracking-wider">
              Loading reviews...
            </span>
          </div>
        )}

        {/* No Reviews State */}
        {!isLoading && reviews.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 font-carbon uppercase tracking-wider">
              No reviews available for{" "}
              {activeTab === "trustpilot" ? "Trustpilot" : "Google"}.
            </p>
          </div>
        )}

        {/* Carousel */}
        {!isLoading && reviews.length > 0 && (
          <div className="relative w-full">
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{
                  transform: `translateX(-${currentSlide * 100}%)`,
                }}
              >
                {Array.from({ length: totalSlides }).map((_, slideIndex) => {
                  const slideReviews = reviews.slice(
                    slideIndex * 2,
                    slideIndex * 2 + 2
                  );
                  return (
                    <div
                      key={slideIndex}
                      className="w-full flex-shrink-0 grid md:grid-cols-2 gap-8 px-4"
                    >
                      {slideReviews.map((review: Review) => (
                        <div
                          key={review.id}
                          className="bg-gray-800 rounded-xl shadow-2xl p-8 hover:shadow-3xl transition-all duration-300 border border-gray-700 hover:border-gray-600"
                        >
                          <div className="flex items-start gap-4 mb-6">
                            <div className="flex-shrink-0">
                              <Image
                                src={
                                  review.avatar ||
                                  `https://i.pravatar.cc/150?u=${review.author}`
                                }
                                alt={review.author}
                                width={48}
                                height={48}
                                className="rounded-full border-2 border-gray-600"
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-bold text-white font-carbon uppercase tracking-wider">
                                  {review.author}
                                </h4>
                                {getPlatformLogo(review.platform)}
                              </div>
                              <div className="flex items-center gap-3 mb-3">
                                {renderStars(review.rating)}
                                {review.verified && (
                                  <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold font-carbon uppercase tracking-wider">
                                    Verified
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-400 font-carbon uppercase tracking-wider">
                                {new Date(review.date).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  }
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="relative">
                            <Quote className="absolute -top-2 -left-2 h-6 w-6 text-gray-600" />
                            <div className="pl-4">
                              {review.title && (
                                <h5 className="font-bold text-white mb-3 font-carbon uppercase tracking-wide">
                                  {review.title}
                                </h5>
                              )}
                              <p className="text-gray-300 leading-relaxed font-carbon">
                                {review.text}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Navigation Buttons */}
            {totalSlides > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-gray-800 rounded-full p-3 shadow-2xl hover:shadow-3xl transition-all z-10 border border-gray-600 hover:border-gray-500"
                  aria-label="Previous reviews"
                >
                  <ChevronLeft className="h-6 w-6 text-white" />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-gray-800 rounded-full p-3 shadow-2xl hover:shadow-3xl transition-all z-10 border border-gray-600 hover:border-gray-500"
                  aria-label="Next reviews"
                >
                  <ChevronRight className="h-6 w-6 text-white" />
                </button>
              </>
            )}

            {/* Dots Indicator */}
            {totalSlides > 1 && (
              <div className="flex justify-center gap-3 mt-12">
                {Array.from({ length: totalSlides }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentSlide(index);
                      setIsAutoPlaying(false);
                    }}
                    className={`w-4 h-4 rounded-full transition-all ${
                      index === currentSlide
                        ? "bg-white shadow-lg"
                        : "bg-gray-600 hover:bg-gray-500"
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-4xl font-black text-white font-carbon">
              {stats.averageRating}
            </div>
            <div className="text-sm text-gray-400 mt-2 font-carbon uppercase tracking-wider">
              Average Rating
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-4xl font-black text-white font-carbon">
              {stats.totalCustomers > 1000
                ? `${Math.floor(stats.totalCustomers / 1000)}K+`
                : stats.totalCustomers}
            </div>
            <div className="text-sm text-gray-400 mt-2 font-carbon uppercase tracking-wider">
              Happy Customers
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-4xl font-black text-white font-carbon">
              {stats.satisfactionRate}%
            </div>
            <div className="text-sm text-gray-400 mt-2 font-carbon uppercase tracking-wider">
              Satisfaction Rate
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-4xl font-black text-white font-carbon">
              {stats.supportAvailability}
            </div>
            <div className="text-sm text-gray-400 mt-2 font-carbon uppercase tracking-wider">
              Customer Support
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
