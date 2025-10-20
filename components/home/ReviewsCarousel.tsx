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
      } catch (error) {
        
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
    <section className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          {title}
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300">{subtitle}</p>
      </div>

      {/* Platform Tabs */}
      <div className="flex justify-center mb-12">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex">
          <button
            onClick={() => {
              setActiveTab("trustpilot");
              setCurrentSlide(0);
              setIsAutoPlaying(true);
            }}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "trustpilot"
                ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
            disabled={isLoading}
          >
            <div className="flex items-center gap-2">
              <div className="bg-green-600 text-white px-2 py-0.5 rounded text-xs font-bold">
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
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "google"
                ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
            disabled={isLoading}
          >
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold">
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
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-gray-500" />
          <span className="ml-2 text-gray-600 dark:text-gray-300">
            Loading reviews...
          </span>
        </div>
      )}

      {/* No Reviews State */}
      {!isLoading && reviews.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-300">
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
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow border dark:border-gray-700"
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <div className="flex-shrink-0">
                            <Image
                              src={
                                review.avatar ||
                                `https://i.pravatar.cc/150?u=${review.author}`
                              }
                              alt={review.author}
                              width={48}
                              height={48}
                              className="rounded-full"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {review.author}
                              </h4>
                              {getPlatformLogo(review.platform)}
                            </div>
                            <div className="flex items-center gap-3 mb-2">
                              {renderStars(review.rating)}
                              {review.verified && (
                                <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full text-xs font-medium">
                                  Verified
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
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
                          <Quote className="absolute -top-2 -left-2 h-6 w-6 text-gray-300 dark:text-gray-600" />
                          <div className="pl-4">
                            {review.title && (
                              <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                                {review.title}
                              </h5>
                            )}
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
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
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg hover:shadow-xl transition-all z-10 border dark:border-gray-700"
                aria-label="Previous reviews"
              >
                <ChevronLeft className="h-6 w-6 text-gray-600 dark:text-gray-300" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg hover:shadow-xl transition-all z-10 border dark:border-gray-700"
                aria-label="Next reviews"
              >
                <ChevronRight className="h-6 w-6 text-gray-600 dark:text-gray-300" />
              </button>
            </>
          )}

          {/* Dots Indicator */}
          {totalSlides > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: totalSlides }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentSlide(index);
                    setIsAutoPlaying(false);
                  }}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentSlide
                      ? "bg-gray-800 dark:bg-white"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        <div>
          <div className="text-4xl font-bold text-gray-900 dark:text-white">
            {stats.averageRating}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Average Rating
          </div>
        </div>
        <div>
          <div className="text-4xl font-bold text-gray-900 dark:text-white">
            {stats.totalCustomers > 1000
              ? `${Math.floor(stats.totalCustomers / 1000)}K+`
              : stats.totalCustomers}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Happy Customers
          </div>
        </div>
        <div>
          <div className="text-4xl font-bold text-gray-900 dark:text-white">
            {stats.satisfactionRate}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Satisfaction Rate
          </div>
        </div>
        <div>
          <div className="text-4xl font-bold text-gray-900 dark:text-white">
            {stats.supportAvailability}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Customer Support
          </div>
        </div>
      </div>
    </section>
  );
}
