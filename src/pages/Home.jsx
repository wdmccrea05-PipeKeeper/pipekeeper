import React from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { createPageUrl } from "@/components/utils/createPageUrl";

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      {/* HERO */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">
          {t("home.heroTitle", "Pipe & Tobacco Collection")}
        </h1>

        <p className="text-lg opacity-80 max-w-3xl mx-auto">
          {t(
            "home.heroSubtitle",
            "Manage your pipes and tobacco blends with AI-powered search, photo identification, pairing suggestions, and market valuations."
          )}
        </p>
      </div>

      {/* PIPE COLLECTION CARD */}
      <Card className="p-6">
        <h2 className="text-2xl font-semibold">
          {t("home.pipeCollectionTitle", "Pipe Collection")}
        </h2>

        <p className="opacity-70">
          {t("home.pipeCollectionSubtitle", "Track and value your pipes")}
        </p>

        <div className="mt-6 space-y-3">
          <div>
            <div className="text-3xl font-bold">14</div>
            <div className="opacity-70">
              {t("home.pipesInCollection", "Pipes in Collection")}
            </div>
          </div>

          <div>
            <div className="text-3xl font-bold">$2,788</div>
            <div className="opacity-70">
              {t("home.collectionValue", "Collection Value")}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <a href={createPageUrl("PipeCollection")}>
            {t("home.viewCollection", "View Collection")}
          </a>
        </div>
      </Card>

      {/* TOBACCO CELLAR CARD */}
      <Card className="p-6">
        <h2 className="text-2xl font-semibold">
          {t("home.tobaccoCellarTitle", "Tobacco Cellar")}
        </h2>

        <p className="opacity-70">
          {t("home.tobaccoCellarSubtitle", "Manage your blends")}
        </p>

        <div className="mt-6 space-y-3">
          <div>
            <div className="text-3xl font-bold">24</div>
            <div className="opacity-70">
              {t("home.tobaccoBlends", "Tobacco Blends")}
            </div>
          </div>

          <div>
            <div className="text-3xl font-bold">8.0 oz</div>
            <div className="opacity-70">
              {t("home.cellared", "Cellared")}
            </div>
          </div>

          <div>
            <div className="text-3xl font-bold">≈ $312</div>
            <div className="opacity-70">
              {t("home.collectionValue", "Collection Value")}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <a href={createPageUrl("TobaccoCellar")}>
            {t("home.viewCellar", "View Cellar")}
          </a>
        </div>
      </Card>
    </div>
  );
}
