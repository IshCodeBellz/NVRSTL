-- CreateTable
CREATE TABLE "PaymentRetryAttempt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "failureReason" TEXT,
    "newPaymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRetryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentRetryAttempt_orderId_idx" ON "PaymentRetryAttempt"("orderId");

-- CreateIndex
CREATE INDEX "PaymentRetryAttempt_paymentId_idx" ON "PaymentRetryAttempt"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentRetryAttempt_status_idx" ON "PaymentRetryAttempt"("status");

-- CreateIndex
CREATE INDEX "PaymentRetryAttempt_scheduledAt_idx" ON "PaymentRetryAttempt"("scheduledAt");

-- AddForeignKey
ALTER TABLE "PaymentRetryAttempt" ADD CONSTRAINT "PaymentRetryAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRetryAttempt" ADD CONSTRAINT "PaymentRetryAttempt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "PaymentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
