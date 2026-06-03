-- CreateTable
CREATE TABLE "network_coverage" (
    "id" TEXT NOT NULL,
    "bundle" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "isoCode" TEXT NOT NULL,
    "networkName" TEXT NOT NULL,
    "apn" TEXT,
    "has3G" BOOLEAN NOT NULL DEFAULT false,
    "has4G" BOOLEAN NOT NULL DEFAULT false,
    "has5G" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "network_coverage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "network_coverage_bundle_idx" ON "network_coverage"("bundle");

-- CreateIndex
CREATE INDEX "network_coverage_countryId_idx" ON "network_coverage"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "network_coverage_bundle_isoCode_networkName_key" ON "network_coverage"("bundle", "isoCode", "networkName");

-- AddForeignKey
ALTER TABLE "network_coverage" ADD CONSTRAINT "network_coverage_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
