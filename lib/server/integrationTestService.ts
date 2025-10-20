/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "./prisma";
import { MFAService } from "./mfa";
import { SocialWishlistService } from "./socialWishlistService";
import { CacheService } from "./cacheService";

/**
 * Integration Testing Service
 * Tests database integration, authentication flows, and performance optimizations
 */
export class IntegrationTestService {
  /**
   * Test database connectivity and basic operations
   */
  static async testDatabaseConnectivity(): Promise<{
    success: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    results: Record<string, any>;
    errors: string[];
  }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: Record<string, any> = {};
    const errors: string[] = [];

    try {
      // Test basic database connection
      const userCount = await prisma.user.count();
      results.userCount = userCount;

      // Test product queries
      const productCount = await prisma.product.count();
      results.productCount = productCount;

      // Test wishlist queries
      const wishlistCount = await prisma.wishlist.count();
      results.wishlistCount = wishlistCount;

      // Test recent behavior tracking
      const recentBehavior = await prisma.userBehavior.count({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });
      results.recentBehaviorCount = recentBehavior;

      results.databaseConnected = true;
    } catch (error) {
      console.error("Error:", error);
      errors.push(`Database connectivity error: ${error}`);
      results.databaseConnected = false;
    }

    return {
      success: errors.length === 0,
      results,
      errors,
    };
  }

  /**
   * Test MFA authentication flows
   */
  static async testMFAFlow(testUserId: string): Promise<{
    success: boolean;
    results: Record<string, any>;
    errors: string[];
  }> {
    const results: Record<string, any> = {};
    const errors: string[] = [];

    try {
      // Test MFA status check
      const initialStatus = await MFAService.getMFAStatus(testUserId);
      results.initialMFAStatus = initialStatus;

      // Test TOTP setup (without actually setting up)
      try {
        const setupResult = await MFAService.setupTOTP(testUserId, "Test App");
        results.totpSetupSuccessful = true;
        results.hasQRCode = !!setupResult.qrCodeUrl;
        results.hasBackupCodes = Array.isArray(setupResult.backupCodes);
      } catch (setupError) {
        errors.push(`MFA setup error: ${setupError}`);
        results.totpSetupSuccessful = false;
      }

      // Test MFA device count (get from database)
      const deviceCount = await prisma.mfaDevice.count({
        where: { userId: testUserId },
      });
      results.mfaDeviceCount = deviceCount;

      results.mfaFlowTested = true;
    } catch (error) {
      console.error("Error:", error);
      errors.push(`MFA flow error: ${error}`);
      results.mfaFlowTested = false;
    }

    return {
      success: errors.length === 0,
      results,
      errors,
    };
  }

  /**
   * Test social wishlist functionality
   */
  static async testSocialWishlistFlow(testUserId: string): Promise<{
    success: boolean;
    results: Record<string, any>;
    errors: string[];
  }> {
    const results: Record<string, any> = {};
    const errors: string[] = [];

    try {
      // Test getting user wishlists
      const userWishlists = await SocialWishlistService.getUserWishlists(
        testUserId
      );
      results.userWishlistCount = userWishlists.length;

      // Test creating a wishlist
      const createResult = await SocialWishlistService.createWishlist({
        userId: testUserId,
        name: `Test Wishlist ${Date.now()}`,
        description: "Integration test wishlist",
        isPublic: false,
      });

      results.wishlistCreated = createResult.success;

      if (createResult.success && createResult.wishlist) {
        results.createdWishlistId = createResult.wishlist.id;

        // Test adding an item to wishlist (if products exist)
        const sampleProduct = await prisma.product.findFirst({
          where: { isActive: true },
        });

        if (sampleProduct) {
          const addResult = await SocialWishlistService.addToWishlist(
            testUserId,
            sampleProduct.id,
            createResult.wishlist.id,
            "Test item"
          );
          results.itemAdded = addResult.success;

          // Test removing from wishlist (need item ID)
          if (addResult.success && addResult.item) {
            const removeResult = await SocialWishlistService.removeFromWishlist(
              testUserId,
              addResult.item.id
            );
            results.itemRemoved = removeResult.success;
          }
        } else {
          results.itemAdded = "No products available for testing";
        }
      }

      results.socialWishlistTested = true;
    } catch (error) {
      console.error("Error:", error);
      errors.push(`Social wishlist error: ${error}`);
      results.socialWishlistTested = false;
    }

    return {
      success: errors.length === 0,
      results,
      errors,
    };
  }

  /**
   * Test caching and performance optimizations
   */
  static async testCachingPerformance(): Promise<{
    success: boolean;
    results: Record<string, any>;
    errors: string[];
  }> {
    const results: Record<string, any> = {};
    const errors: string[] = [];

    try {
      // Test cached product queries
      const startTime = Date.now();
      const featuredProducts = await CacheService.getCachedFeaturedProducts(5);
      const featuredProductsTime = Date.now() - startTime;

      results.featuredProductsCount = featuredProducts.length;
      results.featuredProductsQueryTime = featuredProductsTime;

      // Test cached categories
      const categoriesStartTime = Date.now();
      const categories = await CacheService.getCachedCategories();
      const categoriesTime = Date.now() - categoriesStartTime;

      results.categoriesCount = categories.length;
      results.categoriesQueryTime = categoriesTime;

      // Test cached brands
      const brandsStartTime = Date.now();
      const brands = await CacheService.getCachedBrands();
      const brandsTime = Date.now() - brandsStartTime;

      results.brandsCount = brands.length;
      results.brandsQueryTime = brandsTime;

      // Test search caching
      const searchStartTime = Date.now();
      const searchResults = await CacheService.searchProducts(
        "shirt",
        undefined,
        undefined,
        5
      );
      const searchTime = Date.now() - searchStartTime;

      results.searchResultsCount = searchResults.length;
      results.searchQueryTime = searchTime;

      // Test trending searches
      const trendingSearches = await CacheService.getCachedTrendingSearches(5);
      results.trendingSearchesCount = trendingSearches.length;

      results.performanceOptimized = true;
      results.averageQueryTime =
        (featuredProductsTime + categoriesTime + brandsTime + searchTime) / 4;
    } catch (error) {
      console.error("Error:", error);
      errors.push(`Caching performance error: ${error}`);
      results.performanceOptimized = false;
    }

    return {
      success: errors.length === 0,
      results,
      errors,
    };
  }

  /**
   * Test user behavior tracking and analytics
   */
  static async testAnalyticsTracking(testUserId: string): Promise<{
    success: boolean;
    results: Record<string, any>;
    errors: string[];
  }> {
    const results: Record<string, any> = {};
    const errors: string[] = [];

    try {
      // Get a sample product for testing
      const sampleProduct = await prisma.product.findFirst({
        where: { isActive: true },
      });

      if (!sampleProduct) {
        errors.push("No products available for analytics testing");
        return { success: false, results, errors };
      }

      // Test behavior tracking
      await CacheService.trackUserBehavior(
        testUserId,
        sampleProduct.id,
        "view"
      );
      results.viewTracked = true;

      await CacheService.trackUserBehavior(
        testUserId,
        sampleProduct.id,
        "wishlist"
      );
      results.wishlistTracked = true;

      // Test search tracking
      await CacheService.trackSearch("integration test search", testUserId, 5);
      results.searchTracked = true;

      // Test getting user activity
      const userActivity = await CacheService.getCachedUserActivity(
        testUserId,
        5
      );
      results.userActivityCount = userActivity.length;

      // Test getting recommendations
      const recommendations = await CacheService.getCachedRecommendations(
        testUserId,
        5
      );
      results.recommendationsCount = recommendations.length;

      // Test product analytics
      const productAnalytics = await CacheService.getCachedProductAnalytics(
        sampleProduct.id
      );
      results.productAnalyticsExists = !!productAnalytics;

      results.analyticsTested = true;
    } catch (error) {
      console.error("Error:", error);
      errors.push(`Analytics tracking error: ${error}`);
      results.analyticsTested = false;
    }

    return {
      success: errors.length === 0,
      results,
      errors,
    };
  }

  /**
   * Run comprehensive integration tests
   */
  static async runFullIntegrationTest(testUserId?: string): Promise<{
    success: boolean;
    summary: Record<string, any>;
    details: Record<string, any>;
    errors: string[];
  }> {
    const allErrors: string[] = [];
    const testResults: Record<string, any> = {};

    console.log("🧪 Starting comprehensive integration tests...");

    // Test 1: Database connectivity
    console.log("1️⃣ Testing database connectivity...");
    const dbTest = await this.testDatabaseConnectivity();
    testResults.database = dbTest;
    if (!dbTest.success) {
      allErrors.push(...dbTest.errors);
    }

    // Test 2: Caching and performance
    console.log("2️⃣ Testing caching and performance...");
    const cacheTest = await this.testCachingPerformance();
    testResults.caching = cacheTest;
    if (!cacheTest.success) {
      allErrors.push(...cacheTest.errors);
    }

    // Tests requiring a user ID
    if (testUserId) {
      // Test 3: MFA flows
      console.log("3️⃣ Testing MFA authentication flows...");
      const mfaTest = await this.testMFAFlow(testUserId);
      testResults.mfa = mfaTest;
      if (!mfaTest.success) {
        allErrors.push(...mfaTest.errors);
      }

      // Test 4: Social wishlist functionality
      console.log("4️⃣ Testing social wishlist functionality...");
      const wishlistTest = await this.testSocialWishlistFlow(testUserId);
      testResults.socialWishlist = wishlistTest;
      if (!wishlistTest.success) {
        allErrors.push(...wishlistTest.errors);
      }

      // Test 5: Analytics tracking
      console.log("5️⃣ Testing analytics and behavior tracking...");
      const analyticsTest = await this.testAnalyticsTracking(testUserId);
      testResults.analytics = analyticsTest;
      if (!analyticsTest.success) {
        allErrors.push(...analyticsTest.errors);
      }
    } else {
      console.log("⚠️ Skipping user-specific tests (no test user ID provided)");
    }

    // Generate summary
    const summary = {
      totalTests: Object.keys(testResults).length,
      passedTests: Object.values(testResults).filter(
        (test: { success: boolean }) => test.success
      ).length,
      failedTests: Object.values(testResults).filter(
        (test: { success: boolean }) => !test.success
      ).length,
      totalErrors: allErrors.length,
      databaseIntegration: testResults.database?.success || false,
      authenticationFlows: testResults.mfa?.success || false,
      socialFeatures: testResults.socialWishlist?.success || false,
      performanceOptimization: testResults.caching?.success || false,
      analyticsTracking: testResults.analytics?.success || false,
    };

    console.log("✅ Integration tests completed");
    console.log(
      `📊 Results: ${summary.passedTests}/${summary.totalTests} tests passed`
    );

    return {
      success: allErrors.length === 0,
      summary,
      details: testResults,
      errors: allErrors,
    };
  }
}
