<script setup lang="ts">
import { ref, computed } from "vue";

// Turlar
interface Kemtik {
  id: string;
  nom: string;
  uzunlik: number;
  kenglik: number;
  x: number; // Chapdan masofa (metrda)
  y: number; // Yuqoridan masofa (metrda)
}

interface Peregorodka {
  id: string;
  nom: string;
  birinchiTomon: number;
  ikkinchiTomon: number;
}

interface Xona {
  id: string;
  nom: string;
  uzunlik: number;
  kenglik: number;
  kemtiklar: Kemtik[];
  peregorodkalar: Peregorodka[];
  mavsumTuri: "issiq" | "sovuq";
}

interface Xonadon {
  id: string;
  nom: string;
  xonalar: Xona[];
  sanaYaratilgan: Date;
}

// State
const xonalar = ref<Xona[]>([]);
const xonadonlar = ref<Xonadon[]>([]);
const joriyXona = ref<Xona | null>(null);
const yangiXonaNom = ref("");
const yangiXonaUzunlik = ref<number | "">("");
const yangiXonaKenglik = ref<number | "">("");
const mavsumTuri = ref<"issiq" | "sovuq">("issiq");

// Kemtik qo'shish uchun
const yangiKemtikNom = ref("");
const yangiKemtikUzunlik = ref<number | "">("");
const yangiKemtikKenglik = ref<number | "">("");
const yangiKemtikX = ref<number | "">(""); // Chapdan masofa (metrda)
const yangiKemtikY = ref<number | "">(""); // Yuqoridan masofa (metrda)

// Peregorodka qo'shish uchun
const yangiPeregorodkaNom = ref("");
const yangiPeregorodkaBirinchi = ref<number | "">("");
const yangiPeregorodkaIkkinchi = ref<number | "">("");

// Xonadon saqlash uchun
const xonadonNomi = ref("");
const tanlangan = ref<string[]>([]);

// Canvas
const canvas = ref<HTMLCanvasElement | null>(null);

// Xona qo'shish
const xonaQoshish = () => {
  if (yangiXonaNom.value && yangiXonaUzunlik.value && yangiXonaKenglik.value) {
    const yangiXona: Xona = {
      id: Date.now().toString(),
      nom: yangiXonaNom.value,
      uzunlik: Number(yangiXonaUzunlik.value),
      kenglik: Number(yangiXonaKenglik.value),
      kemtiklar: [],
      peregorodkalar: [],
      mavsumTuri: mavsumTuri.value,
    };
    xonalar.value.push(yangiXona);
    joriyXona.value = yangiXona;
    yangiXonaNom.value = "";
    yangiXonaUzunlik.value = "";
    yangiXonaKenglik.value = "";
    chizmaChizish();
  }
};

// Kemtik qo'shish
const kemtikQoshish = () => {
  if (
    joriyXona.value &&
    yangiKemtikNom.value &&
    yangiKemtikUzunlik.value &&
    yangiKemtikKenglik.value &&
    yangiKemtikX.value !== "" &&
    yangiKemtikY.value !== ""
  ) {
    const kemtik: Kemtik = {
      id: Date.now().toString(),
      nom: yangiKemtikNom.value,
      uzunlik: Number(yangiKemtikUzunlik.value),
      kenglik: Number(yangiKemtikKenglik.value),
      x: Number(yangiKemtikX.value),
      y: Number(yangiKemtikY.value),
    };
    joriyXona.value.kemtiklar.push(kemtik);
    yangiKemtikNom.value = "";
    yangiKemtikUzunlik.value = "";
    yangiKemtikKenglik.value = "";
    yangiKemtikX.value = "";
    yangiKemtikY.value = "";
    chizmaChizish();
  }
};

// Peregorodka qo'shish
const peregorodkaQoshish = () => {
  if (
    joriyXona.value &&
    yangiPeregorodkaNom.value &&
    yangiPeregorodkaBirinchi.value &&
    yangiPeregorodkaIkkinchi.value
  ) {
    const peregorodka: Peregorodka = {
      id: Date.now().toString(),
      nom: yangiPeregorodkaNom.value,
      birinchiTomon: Number(yangiPeregorodkaBirinchi.value),
      ikkinchiTomon: Number(yangiPeregorodkaIkkinchi.value),
    };
    joriyXona.value.peregorodkalar.push(peregorodka);
    yangiPeregorodkaNom.value = "";
    yangiPeregorodkaBirinchi.value = "";
    yangiPeregorodkaIkkinchi.value = "";
    chizmaChizish();
  }
};

// Xonani tanlash
const xonaTanlash = (xona: Xona) => {
  joriyXona.value = xona;
  chizmaChizish();
};

// Kemtikni o'chirish
const kemtikOchirish = (kemtikId: string) => {
  if (joriyXona.value) {
    joriyXona.value.kemtiklar = joriyXona.value.kemtiklar.filter(
      (k) => k.id !== kemtikId,
    );
    chizmaChizish();
  }
};

// Peregorodkani o'chirish
const peregorodkaOchirish = (peregorodkaId: string) => {
  if (joriyXona.value) {
    joriyXona.value.peregorodkalar = joriyXona.value.peregorodkalar.filter(
      (p) => p.id !== peregorodkaId,
    );
    chizmaChizish();
  }
};

// Xonani o'chirish
const xonaOchirish = (xonaId: string) => {
  xonalar.value = xonalar.value.filter((x) => x.id !== xonaId);
  if (joriyXona.value?.id === xonaId) {
    joriyXona.value =
      xonalar.value.length > 0 ? xonalar.value[0] ?? null : null;
    chizmaChizish();
  }
};

// Hisoblashlar
const xonaMaydon = computed(() => {
  if (!joriyXona.value) return 0;
  return joriyXona.value.uzunlik * joriyXona.value.kenglik;
});

const kemtiklarMaydon = computed(() => {
  if (!joriyXona.value) return 0;
  return joriyXona.value.kemtiklar.reduce(
    (sum, k) => sum + k.uzunlik * k.kenglik,
    0,
  );
});

const kemtiklarMaterialMaydon = computed(() => {
  if (!joriyXona.value) return 0;
  const foiz = joriyXona.value.mavsumTuri === "issiq" ? 0.1 : 0.07;
  return joriyXona.value.kemtiklar.reduce((sum, k) => {
    return sum + k.uzunlik * k.kenglik * (1 - foiz);
  }, 0);
});

const peregorodkaMaydon = computed(() => {
  if (!joriyXona.value) return 0;
  const foiz = joriyXona.value.mavsumTuri === "issiq" ? 0.1 : 0.07;
  return joriyXona.value.peregorodkalar.reduce((sum, p) => {
    const birinchi = p.birinchiTomon * joriyXona.value!.kenglik * (1 - foiz);
    const ikkinchi = p.ikkinchiTomon * joriyXona.value!.kenglik * (1 - foiz);
    return sum + birinchi + ikkinchi;
  }, 0);
});

const tozaMaydon = computed(() => {
  return xonaMaydon.value - kemtiklarMaydon.value;
});

const materialMaydon = computed(() => {
  if (!joriyXona.value) return 0;
  const foiz = joriyXona.value.mavsumTuri === "issiq" ? 0.1 : 0.07;

  // Asosiy xona materiali (kemtiklarni hisobga olgan holda)
  const asosiyMaterial = tozaMaydon.value * (1 - foiz);

  // Har bir kemtik atrofida material maydonini hisoblash
  // Material kemtik atrofidan aylanib o'tadi
  const kemtikMaterialQoshimcha = joriyXona.value.kemtiklar.reduce((sum, k) => {
    // Kemtik atrofidagi qo'shimcha material (kemtikning o'zi ham material bilan qoplanadi)
    const kemtikMaydon = k.uzunlik * k.kenglik;
    // Kemtik joyida material yo'q, lekin kemtik atrofida material bor
    // Shuning uchun kemtik maydonini materialdan ayiramiz
    return sum - kemtikMaydon * (1 - foiz);
  }, 0);

  return asosiyMaterial + peregorodkaMaydon.value + kemtikMaterialQoshimcha;
});

// Kemtikka qadar material masofasini hisoblash
const kemtikMasofalar = computed(() => {
  if (!joriyXona.value) return [];
  const foiz = joriyXona.value.mavsumTuri === "issiq" ? 0.1 : 0.07;

  return joriyXona.value.kemtiklar.map((kemtik) => {
    // Chapdan kemtikkacha material masofasi
    const chap = kemtik.x * (1 - foiz);
    // Yuqoridan kemtikkacha material masofasi
    const yuqori = kemtik.y * (1 - foiz);
    // Kemtik o'ngidan devorgacha material masofasi
    const ong =
      (joriyXona.value!.uzunlik - kemtik.x - kemtik.uzunlik) * (1 - foiz);
    // Kemtik pastidan devorgacha material masofasi
    const past =
      (joriyXona.value!.kenglik - kemtik.y - kemtik.kenglik) * (1 - foiz);

    return {
      kemtikId: kemtik.id,
      kemtikNom: kemtik.nom,
      chap: chap.toFixed(2),
      yuqori: yuqori.toFixed(2),
      ong: ong.toFixed(2),
      past: past.toFixed(2),
      // Kemtikni ham hisobga olgan holda to'liq masofalar
      chapTotal: (chap + kemtik.uzunlik).toFixed(2),
      yuqoriTotal: (yuqori + kemtik.kenglik).toFixed(2),
    };
  });
});

const foizKamayish = computed(() => {
  return joriyXona.value?.mavsumTuri === "issiq" ? 10 : 7;
});

// Umumiy hisoblashlar
const umumiyXonaMaydon = computed(() => {
  return xonalar.value.reduce((sum, x) => {
    const maydon = x.uzunlik * x.kenglik;
    const kemtiklar = x.kemtiklar.reduce(
      (s, k) => s + k.uzunlik * k.kenglik,
      0,
    );
    return sum + (maydon - kemtiklar);
  }, 0);
});

const umumiyMaterialMaydon = computed(() => {
  return xonalar.value.reduce((sum, x) => {
    const maydon = x.uzunlik * x.kenglik;
    const kemtiklar = x.kemtiklar.reduce(
      (s, k) => s + k.uzunlik * k.kenglik,
      0,
    );
    const toza = maydon - kemtiklar;
    const foiz = x.mavsumTuri === "issiq" ? 0.1 : 0.07;

    // Peregorodka material
    const peregorodka = x.peregorodkalar.reduce((s, p) => {
      const birinchi = p.birinchiTomon * x.kenglik * (1 - foiz);
      const ikkinchi = p.ikkinchiTomon * x.kenglik * (1 - foiz);
      return s + birinchi + ikkinchi;
    }, 0);

    // Kemtiklar atrofida material kamayishi
    const kemtikMaterialKamayish = x.kemtiklar.reduce((s, k) => {
      const kemtikMaydon = k.uzunlik * k.kenglik;
      return s + kemtikMaydon * foiz;
    }, 0);

    return sum + toza * (1 - foiz) + peregorodka - kemtikMaterialKamayish;
  }, 0);
});

// Chizma chizish
const chizmaChizish = () => {
  if (!canvas.value || !joriyXona.value) return;

  const ctx = canvas.value.getContext("2d");
  if (!ctx) return;

  // Canvas tozalash
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);

  const padding = 80;
  const canvasWidth = canvas.value.width - padding * 2;
  const canvasHeight = canvas.value.height - padding * 2;

  // Masshtab
  const scaleX = canvasWidth / joriyXona.value.uzunlik;
  const scaleY = canvasHeight / joriyXona.value.kenglik;
  const scale = Math.min(scaleX, scaleY, 100); // maksimal 100px/m

  const roomWidth = joriyXona.value.uzunlik * scale;
  const roomHeight = joriyXona.value.kenglik * scale;

  const startX = (canvas.value.width - roomWidth) / 2;
  const startY = (canvas.value.height - roomHeight) / 2;

  // Asosiy xona (ko'k rang)
  ctx.fillStyle = "#DBEAFE";
  ctx.strokeStyle = "#1E40AF";
  ctx.lineWidth = 4;
  ctx.fillRect(startX, startY, roomWidth, roomHeight);
  ctx.strokeRect(startX, startY, roomWidth, roomHeight);

  // Material maydoni (yashil rang, kichikroq)
  const foiz = joriyXona.value.mavsumTuri === "issiq" ? 0.1 : 0.07;
  const materialWidth = roomWidth * (1 - foiz);
  const materialHeight = roomHeight * (1 - foiz);
  const materialStartX = startX + (roomWidth - materialWidth) / 2;
  const materialStartY = startY + (roomHeight - materialHeight) / 2;

  // Agar kemtik bo'lmasa, oddiy to'rtburchak
  if (joriyXona.value.kemtiklar.length === 0) {
    ctx.fillStyle = "rgba(134, 239, 172, 0.5)";
    ctx.strokeStyle = "#15803D";
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.fillRect(materialStartX, materialStartY, materialWidth, materialHeight);
    ctx.strokeRect(
      materialStartX,
      materialStartY,
      materialWidth,
      materialHeight,
    );
    ctx.setLineDash([]);
  } else {
    // Kemtik bo'lsa, materialning kompleks konturini chizish
    ctx.save();
    ctx.fillStyle = "rgba(134, 239, 172, 0.5)";
    ctx.strokeStyle = "#15803D";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);

    // Path yordamida materialning konturini chizamiz
    ctx.beginPath();
    ctx.rect(materialStartX, materialStartY, materialWidth, materialHeight);

    // Har bir kemtik joyida teshik ochish
    joriyXona.value.kemtiklar.forEach((kemtik) => {
      const offsetX = (roomWidth - materialWidth) / 2;
      const offsetY = (roomHeight - materialHeight) / 2;

      // Kemtikning material koordinatalardagi pozitsiyasi
      const kemtikMaterialX = startX + kemtik.x * scale + offsetX;
      const kemtikMaterialY = startY + kemtik.y * scale + offsetY;
      const kemtikMaterialW = kemtik.uzunlik * scale;
      const kemtikMaterialH = kemtik.kenglik * scale;

      // Teshik (teskari yo'nalishda)
      ctx.rect(
        kemtikMaterialX + kemtikMaterialW,
        kemtikMaterialY,
        -kemtikMaterialW,
        kemtikMaterialH,
      );
    });

    ctx.fill("evenodd");
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Material o'lchamlarini CHIZMA ICHIDA ko'rsatish
  ctx.fillStyle = "#15803D";
  ctx.font = "bold 28px Arial";
  const materialUzunlik = (joriyXona.value.uzunlik * (1 - foiz)).toFixed(2);
  const materialKenglik = (joriyXona.value.kenglik * (1 - foiz)).toFixed(2);

  // Yuqori chap burchakda material o'lchamlari
  ctx.fillText(
    `Material: ${materialUzunlik}×${materialKenglik}m`,
    materialStartX + 20,
    materialStartY + 40,
  );

  // Material foizini ko'rsatish
  ctx.font = "bold 24px Arial";
  ctx.fillStyle = "#166534";
  ctx.fillText(
    `(-${foizKamayish.value}%)`,
    materialStartX + 20,
    materialStartY + 70,
  );

  // Kemtiklar uchun material masofalarini ko'rsatish
  joriyXona.value.kemtiklar.forEach((kemtik) => {
    const offsetX = (roomWidth - materialWidth) / 2;
    const offsetY = (roomHeight - materialHeight) / 2;

    // Kemtikning material koordinatalardagi pozitsiyasi
    const kemtikMaterialX = startX + kemtik.x * scale + offsetX;
    const kemtikMaterialY = startY + kemtik.y * scale + offsetY;
    const kemtikMaterialW = kemtik.uzunlik * scale;
    const kemtikMaterialH = kemtik.kenglik * scale;

    // Chapdan kemtikkacha masofa
    const chapMasofa = (kemtik.x * (1 - foiz)).toFixed(2);
    const yuqoriMasofa = (kemtik.y * (1 - foiz)).toFixed(2);
    const ongMasofa = (
      (joriyXona.value!.uzunlik - kemtik.x - kemtik.uzunlik) *
      (1 - foiz)
    ).toFixed(2);
    const pastMasofa = (
      (joriyXona.value!.kenglik - kemtik.y - kemtik.kenglik) *
      (1 - foiz)
    ).toFixed(2);

    // Chiziqlar va o'lchamlar
    ctx.strokeStyle = "#DC2626";
    ctx.lineWidth = 3;
    ctx.setLineDash([]);

    // Gorizontal chiziqlar (yuqori va pastda)
    if (parseFloat(chapMasofa) > 0.1) {
      // Yuqoridan chapdan kemtikkacha chiziq
      ctx.beginPath();
      ctx.moveTo(materialStartX, kemtikMaterialY - 18);
      ctx.lineTo(kemtikMaterialX, kemtikMaterialY - 18);
      ctx.stroke();

      // O'lcham
      ctx.fillStyle = "#DC2626";
      ctx.font = "bold 16px Arial";
      ctx.fillText(
        `${chapMasofa}m`,
        materialStartX + (kemtikMaterialX - materialStartX) / 2 - 20,
        kemtikMaterialY - 25,
      );
    }

    if (parseFloat(ongMasofa) > 0.1) {
      // Yuqoridan kemtikdan o'ngga chiziq
      ctx.beginPath();
      ctx.moveTo(kemtikMaterialX + kemtikMaterialW, kemtikMaterialY - 18);
      ctx.lineTo(materialStartX + materialWidth, kemtikMaterialY - 18);
      ctx.stroke();

      // O'lcham
      ctx.fillStyle = "#DC2626";
      ctx.font = "bold 16px Arial";
      ctx.fillText(
        `${ongMasofa}m`,
        kemtikMaterialX +
          kemtikMaterialW +
          (materialStartX + materialWidth - kemtikMaterialX - kemtikMaterialW) /
            2 -
          20,
        kemtikMaterialY - 25,
      );
    }

    // Vertikal chiziqlar (chap va o'ngda)
    if (parseFloat(yuqoriMasofa) > 0.1) {
      // Chapdan yuqoridan kemtikkacha chiziq
      ctx.beginPath();
      ctx.moveTo(kemtikMaterialX - 15, materialStartY);
      ctx.lineTo(kemtikMaterialX - 15, kemtikMaterialY);
      ctx.stroke();

      // O'lcham (vertikal)
      ctx.save();
      ctx.fillStyle = "#DC2626";
      ctx.font = "bold 16px Arial";
      ctx.translate(
        kemtikMaterialX - 20,
        materialStartY + (kemtikMaterialY - materialStartY) / 2,
      );
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`${yuqoriMasofa}m`, -20, 0);
      ctx.restore();
    }

    if (parseFloat(pastMasofa) > 0.1) {
      // Chapdan kemtikdan pastga chiziq
      ctx.beginPath();
      ctx.moveTo(kemtikMaterialX - 15, kemtikMaterialY + kemtikMaterialH);
      ctx.lineTo(kemtikMaterialX - 15, materialStartY + materialHeight);
      ctx.stroke();

      // O'lcham (vertikal)
      ctx.save();
      ctx.fillStyle = "#DC2626";
      ctx.font = "bold 16px Arial";
      ctx.translate(
        kemtikMaterialX - 20,
        kemtikMaterialY +
          kemtikMaterialH +
          (materialStartY +
            materialHeight -
            kemtikMaterialY -
            kemtikMaterialH) /
            2,
      );
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`${pastMasofa}m`, -20, 0);
      ctx.restore();
    }

    // Kemtik o'lchamini material ichida ko'rsatish
    ctx.fillStyle = "#7F1D1D";
    ctx.font = "bold 15px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      `Kemtik: ${kemtik.uzunlik}×${kemtik.kenglik}m`,
      kemtikMaterialX + kemtikMaterialW / 2,
      kemtikMaterialY + kemtikMaterialH / 2,
    );
    ctx.textAlign = "left";
  });

  // Kemtiklar (qizil rang)
  ctx.fillStyle = "#FEE2E2";
  ctx.strokeStyle = "#991B1B";
  ctx.lineWidth = 2.5;

  joriyXona.value.kemtiklar.forEach((kemtik) => {
    const kemtikW = kemtik.uzunlik * scale;
    const kemtikH = kemtik.kenglik * scale;

    // Metr koordinatalardan pixel koordinatalarga o'tkazish
    // x va y - bu kemtikning chap-yuqori burchagining koordinatalari
    const kemtikX = startX + kemtik.x * scale;
    const kemtikY = startY + kemtik.y * scale;

    // Kemtikning o'zi
    ctx.fillStyle = "#FEE2E2";
    ctx.strokeStyle = "#991B1B";
    ctx.lineWidth = 2.5;
    ctx.fillRect(kemtikX, kemtikY, kemtikW, kemtikH);
    ctx.strokeRect(kemtikX, kemtikY, kemtikW, kemtikH);

    // Kemtik nomi
    ctx.fillStyle = "#991B1B";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(kemtik.nom, kemtikX + kemtikW / 2, kemtikY + kemtikH / 2 + 6);
    ctx.textAlign = "left";

    // Kemtik o'lchamlarini ko'rsatish
    ctx.fillStyle = "#7F1D1D";
    ctx.font = "bold 15px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      `${kemtik.uzunlik}×${kemtik.kenglik}m`,
      kemtikX + kemtikW / 2,
      kemtikY - 10,
    );
    ctx.textAlign = "left";

    // Kemtik koordinatalarini ko'rsatish
    ctx.fillStyle = "#7F1D1D";
    ctx.font = "13px Arial";
    ctx.fillText(
      `X:${kemtik.x}m Y:${kemtik.y}m`,
      kemtikX + 3,
      kemtikY + kemtikH + 18,
    );
  });

  // Peregorodkalar (sariq rang)
  ctx.strokeStyle = "#A16207";
  ctx.lineWidth = 5;

  let peregorodkaY = startY + roomHeight * 0.3;
  joriyXona.value.peregorodkalar.forEach((per, index) => {
    peregorodkaY =
      startY +
      (roomHeight / (joriyXona.value!.peregorodkalar.length + 1)) * (index + 1);

    // Peregorodka chizig'i
    ctx.beginPath();
    ctx.moveTo(startX, peregorodkaY);
    ctx.lineTo(startX + roomWidth, peregorodkaY);
    ctx.stroke();

    // Birinchi tomon material maydoni
    const birinchiH = per.birinchiTomon * scale;
    const mat1H = birinchiH * (1 - foiz);
    const mat1Y = startY + (peregorodkaY - startY - mat1H) / 2;

    ctx.fillStyle = "rgba(253, 224, 71, 0.3)";
    ctx.fillRect(materialStartX, mat1Y, materialWidth, mat1H);

    // Ikkinchi tomon material maydoni
    const ikkinchiH = per.ikkinchiTomon * scale;
    const mat2H = ikkinchiH * (1 - foiz);
    const mat2Y =
      peregorodkaY + (startY + roomHeight - peregorodkaY - mat2H) / 2;

    ctx.fillRect(materialStartX, mat2Y, materialWidth, mat2H);

    // Peregorodka nomi
    ctx.fillStyle = "#A16207";
    ctx.font = "bold 16px Arial";
    ctx.fillText(per.nom, startX + roomWidth + 15, peregorodkaY + 6);
  });

  // O'lchamlar
  ctx.fillStyle = "#000000";
  ctx.font = "16px Arial";

  // Uzunlik
  ctx.fillText(
    `${joriyXona.value.uzunlik.toFixed(2)} m`,
    startX + roomWidth / 2 - 35,
    startY - 15,
  );

  // Kenglik
  ctx.save();
  ctx.translate(startX - 35, startY + roomHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${joriyXona.value.kenglik.toFixed(2)} m`, 0, 0);
  ctx.restore();

  // Legenda
  ctx.font = "13px Arial";
  const legendY = startY + roomHeight + 45;
  const legendStartX = startX - 20;

  // Birinchi qator
  ctx.fillStyle = "#1E40AF";
  ctx.fillRect(legendStartX, legendY, 20, 15);
  ctx.strokeStyle = "#1E40AF";
  ctx.lineWidth = 1;
  ctx.strokeRect(legendStartX, legendY, 20, 15);
  ctx.fillStyle = "#000000";
  ctx.fillText("- Xona", legendStartX + 25, legendY + 11);

  ctx.fillStyle = "#991B1B";
  ctx.fillRect(legendStartX + 100, legendY, 20, 15);
  ctx.strokeStyle = "#991B1B";
  ctx.strokeRect(legendStartX + 100, legendY, 20, 15);
  ctx.fillStyle = "#000000";
  ctx.fillText("- Kemtik (asosiy)", legendStartX + 125, legendY + 11);

  // Ikkinchi qator
  const legendY2 = legendY + 22;
  ctx.fillStyle = "rgba(134, 239, 172, 0.5)";
  ctx.fillRect(legendStartX, legendY2, 20, 15);
  ctx.strokeStyle = "#15803D";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(legendStartX, legendY2, 20, 15);
  ctx.setLineDash([]);
  ctx.fillStyle = "#000000";
  ctx.fillText(
    `- Material (-${foizKamayish.value}%)`,
    legendStartX + 25,
    legendY2 + 11,
  );

  ctx.fillStyle = "rgba(254, 243, 199, 0.8)";
  ctx.fillRect(legendStartX + 160, legendY2, 20, 15);
  ctx.strokeStyle = "#F59E0B";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(legendStartX + 160, legendY2, 20, 15);
  ctx.setLineDash([]);
  ctx.fillStyle = "#000000";
  ctx.fillText(
    `- Kemtik material (-${foizKamayish.value}%)`,
    legendStartX + 185,
    legendY2 + 11,
  );

  // Uchinchi qator (agar peregorodka bo'lsa)
  if (joriyXona.value.peregorodkalar.length > 0) {
    const legendY3 = legendY2 + 22;
    ctx.fillStyle = "#A16207";
    ctx.fillRect(legendStartX, legendY3, 20, 15);
    ctx.strokeStyle = "#A16207";
    ctx.lineWidth = 2;
    ctx.strokeRect(legendStartX, legendY3, 20, 15);
    ctx.fillStyle = "#000000";
    ctx.fillText("- Peregorodka", legendStartX + 25, legendY3 + 11);
  }
};

// Xonadonni saqlash
const xonadonSaqlash = () => {
  if (!xonadonNomi.value) {
    alert("Xonadon nomini kiriting!");
    return;
  }

  const tanlganXonalar = tanlangan.value
    .map((id) => {
      const xona = xonalar.value.find((x) => x.id === id);
      return xona ? { ...xona } : null;
    })
    .filter((x) => x !== null) as Xona[];

  if (tanlganXonalar.length === 0) {
    alert("Hech bo'lmasa bitta xona tanlang!");
    return;
  }

  const yangiXonadon: Xonadon = {
    id: Date.now().toString(),
    nom: xonadonNomi.value,
    xonalar: tanlganXonalar,
    sanaYaratilgan: new Date(),
  };

  xonadonlar.value.push(yangiXonadon);
  xonadonNomi.value = "";
  tanlangan.value = [];

  // LocalStorage ga saqlash
  localStorage.setItem("xonadonlar", JSON.stringify(xonadonlar.value));

  alert("Xonadon muvaffaqiyatli saqlandi!");
};

// Xonadonni yuklash
const xonadonYuklash = (xonadon: Xonadon) => {
  if (confirm(`"${xonadon.nom}" xonadonini yuklaysizmi?`)) {
    xonalar.value = xonadon.xonalar.map((x) => ({ ...x }));
    joriyXona.value = xonalar.value.length > 0 ? xonalar.value[0] : null;
    chizmaChizish();
  }
};

// Xonadonni o'chirish
const xonadonOchirish = (xonadonId: string) => {
  if (confirm("Bu xonadonni o'chirmoqchimisiz?")) {
    xonadonlar.value = xonadonlar.value.filter((x) => x.id !== xonadonId);
    localStorage.setItem("xonadonlar", JSON.stringify(xonadonlar.value));
  }
};

// LocalStorage dan yuklash
const localStorageDanYuklash = () => {
  const saqlangan = localStorage.getItem("xonadonlar");
  if (saqlangan) {
    try {
      xonadonlar.value = JSON.parse(saqlangan);
    } catch (e) {
      console.error("LocalStorage dan yuklashda xatolik:", e);
    }
  }
};

// Component yuklanganda
import { onMounted } from "vue";
onMounted(() => {
  localStorageDanYuklash();
  if (canvas.value) {
    chizmaChizish();
  }
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
    <div class="max-w-7xl mx-auto">
      <!-- Sarlavha -->
      <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h1 class="text-3xl font-bold text-indigo-900 mb-2">
          🏠 Натяжной Потолок Калькулятори
        </h1>
        <p class="text-gray-600">
          Xonalar, kemtiklar va peregorodkalar bilan professional hisoblash
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Chap panel - Xona qo'shish -->
        <div class="lg:col-span-1 space-y-6">
          <!-- Yangi xona qo'shish -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-xl font-bold text-gray-800 mb-4">
              ➕ Yangi Xona Qo'shish
            </h2>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Xona nomi</label
                >
                <input
                  v-model="yangiXonaNom"
                  type="text"
                  placeholder="Masalan: Yotoq xona"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Xonaning eni (m)</label
                >
                <input
                  v-model="yangiXonaUzunlik"
                  type="number"
                  step="0.01"
                  placeholder="5.5"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Xonaning uzunligi (m)</label
                >
                <input
                  v-model="yangiXonaKenglik"
                  type="number"
                  step="0.01"
                  placeholder="4.2"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Mavsum</label
                >
                <select
                  v-model="mavsumTuri"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="issiq">☀️ Issiq (−10%)</option>
                  <option value="sovuq">❄️ Sovuq (−7%)</option>
                </select>
              </div>

              <button
                @click="xonaQoshish"
                class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-md"
              >
                Xona Qo'shish
              </button>
            </div>
          </div>

          <!-- Mavjud xonalar ro'yxati -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-xl font-bold text-gray-800 mb-4">
              📋 Mavjud Xonalar ({{ xonalar.length }})
            </h2>

            <div
              v-if="xonalar.length === 0"
              class="text-center text-gray-500 py-8"
            >
              Hozircha xonalar yo'q
            </div>

            <div v-else class="space-y-2 max-h-96 overflow-y-auto">
              <div
                v-for="xona in xonalar"
                :key="xona.id"
                @click="xonaTanlash(xona)"
                class="p-4 border rounded-lg cursor-pointer transition duration-200 hover:shadow-md"
                :class="
                  joriyXona?.id === xona.id
                    ? 'bg-indigo-50 border-indigo-500'
                    : 'bg-gray-50 border-gray-200'
                "
              >
                <div class="flex justify-between items-start mb-2">
                  <h3 class="font-semibold text-gray-800">{{ xona.nom }}</h3>
                  <button
                    @click.stop="xonaOchirish(xona.id)"
                    class="text-red-500 hover:text-red-700 text-xl leading-none"
                  >
                    ×
                  </button>
                </div>
                <p class="text-sm text-gray-600">
                  {{ xona.uzunlik }}m × {{ xona.kenglik }}m =
                  {{ (xona.uzunlik * xona.kenglik).toFixed(2) }}m²
                </p>
                <p class="text-xs text-gray-500 mt-1">
                  {{ xona.mavsumTuri === "issiq" ? "☀️ Issiq" : "❄️ Sovuq" }} |
                  Kemtiklar: {{ xona.kemtiklar.length }} | Peregorodka:
                  {{ xona.peregorodkalar.length }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- O'rta panel - Chizma va hisoblashlar -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Chizma va Material O'lchamlari -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-xl font-bold text-gray-800 mb-4">
              📐 Xona Chizmasi
              <span
                v-if="joriyXona"
                class="text-base font-normal text-indigo-600"
              >
                - {{ joriyXona.nom }}
              </span>
            </h2>

            <div class="grid md:grid-cols-3 gap-4">
              <!-- Chizma (chap tomon) -->
              <div
                class="md:col-span-2 border-2 border-gray-200 rounded-lg bg-gray-50 overflow-hidden"
              >
                <canvas
                  ref="canvas"
                  width="700"
                  height="500"
                  class="w-full"
                ></canvas>
              </div>

              <!-- Material o'lchamlari ro'yxati (o'ng tomon) -->
              <div v-if="joriyXona" class="space-y-3">
                <div
                  class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-200"
                >
                  <h3 class="text-sm font-bold text-green-800 mb-2">
                    📏 Material O'lchamlari
                  </h3>
                  <div class="space-y-2 text-sm">
                    <div class="bg-white rounded p-2">
                      <p class="text-xs text-gray-600">Uzunlik</p>
                      <p class="font-bold text-green-700">
                        {{
                          (
                            joriyXona.uzunlik *
                            (1 -
                              (joriyXona.mavsumTuri === "issiq" ? 0.1 : 0.07))
                          ).toFixed(2)
                        }}m
                      </p>
                    </div>
                    <div class="bg-white rounded p-2">
                      <p class="text-xs text-gray-600">Kenglik</p>
                      <p class="font-bold text-green-700">
                        {{
                          (
                            joriyXona.kenglik *
                            (1 -
                              (joriyXona.mavsumTuri === "issiq" ? 0.1 : 0.07))
                          ).toFixed(2)
                        }}m
                      </p>
                    </div>
                    <div class="bg-white rounded p-2">
                      <p class="text-xs text-gray-600">Jami maydon</p>
                      <p class="font-bold text-green-700">
                        {{ materialMaydon.toFixed(2) }}m²
                      </p>
                    </div>
                    <div class="bg-green-100 rounded p-2">
                      <p class="text-xs text-green-700">Kamayish</p>
                      <p class="font-bold text-green-800">
                        -{{ foizKamayish }}%
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Kemtik masofalar (agar mavjud bo'lsa) -->
                <div
                  v-if="joriyXona.kemtiklar.length > 0"
                  class="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-4 border-2 border-red-200"
                >
                  <h3 class="text-sm font-bold text-red-800 mb-2">
                    🔴 Kemtik Masofalar
                  </h3>
                  <div
                    v-for="masofa in kemtikMasofalar"
                    :key="masofa.kemtikId"
                    class="mb-3 last:mb-0"
                  >
                    <p class="text-xs font-semibold text-red-700 mb-1">
                      {{ masofa.kemtikNom }}
                    </p>
                    <div class="space-y-1 text-xs">
                      <div
                        class="flex justify-between bg-white rounded px-2 py-1"
                      >
                        <span class="text-gray-600">⬅️ Chap:</span>
                        <span class="font-bold text-red-600"
                          >{{ masofa.chap }}m</span
                        >
                      </div>
                      <div
                        class="flex justify-between bg-white rounded px-2 py-1"
                      >
                        <span class="text-gray-600">⬆️ Yuqori:</span>
                        <span class="font-bold text-orange-600"
                          >{{ masofa.yuqori }}m</span
                        >
                      </div>
                      <div
                        class="flex justify-between bg-white rounded px-2 py-1"
                      >
                        <span class="text-gray-600">➡️ O'ng:</span>
                        <span class="font-bold text-yellow-600"
                          >{{ masofa.ong }}m</span
                        >
                      </div>
                      <div
                        class="flex justify-between bg-white rounded px-2 py-1"
                      >
                        <span class="text-gray-600">⬇️ Past:</span>
                        <span class="font-bold text-green-600"
                          >{{ masofa.past }}m</span
                        >
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Xona o'lchamlari -->
                <div
                  class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200"
                >
                  <h3 class="text-sm font-bold text-blue-800 mb-2">
                    🏠 Xona O'lchamlari
                  </h3>
                  <div class="space-y-2 text-sm">
                    <div class="bg-white rounded p-2">
                      <p class="text-xs text-gray-600">Uzunlik</p>
                      <p class="font-bold text-blue-700">
                        {{ joriyXona.uzunlik.toFixed(2) }}m
                      </p>
                    </div>
                    <div class="bg-white rounded p-2">
                      <p class="text-xs text-gray-600">Kenglik</p>
                      <p class="font-bold text-blue-700">
                        {{ joriyXona.kenglik.toFixed(2) }}m
                      </p>
                    </div>
                    <div class="bg-white rounded p-2">
                      <p class="text-xs text-gray-600">Maydon</p>
                      <p class="font-bold text-blue-700">
                        {{ xonaMaydon.toFixed(2) }}m²
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Asosiy hisoblashlar -->
          <div v-if="joriyXona" class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-xl font-bold text-gray-800 mb-4">
              📊 Umumiy Hisoblashlar
            </h2>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="bg-blue-50 rounded-lg p-4">
                <p class="text-sm text-gray-600 mb-1">Xona Maydoni</p>
                <p class="text-2xl font-bold text-blue-600">
                  {{ xonaMaydon.toFixed(2) }} m²
                </p>
              </div>

              <div class="bg-red-50 rounded-lg p-4">
                <p class="text-sm text-gray-600 mb-1">Kemtiklar</p>
                <p class="text-2xl font-bold text-red-600">
                  {{ kemtiklarMaydon.toFixed(2) }} m²
                </p>
              </div>

              <div class="bg-green-50 rounded-lg p-4">
                <p class="text-sm text-gray-600 mb-1">Toza Maydon</p>
                <p class="text-2xl font-bold text-green-600">
                  {{ tozaMaydon.toFixed(2) }} m²
                </p>
              </div>

              <div class="bg-indigo-50 rounded-lg p-4">
                <p class="text-sm text-gray-600 mb-1">
                  Material (-{{ foizKamayish }}%)
                </p>
                <p class="text-2xl font-bold text-indigo-600">
                  {{ materialMaydon.toFixed(2) }} m²
                </p>
              </div>
            </div>

            <div
              v-if="joriyXona.kemtiklar.length > 0 || peregorodkaMaydon > 0"
              class="grid grid-cols-2 gap-4 mt-4"
            >
              <div
                v-if="joriyXona.kemtiklar.length > 0"
                class="bg-orange-50 rounded-lg p-4"
              >
                <p class="text-sm text-gray-600 mb-1">Kemtiklar Material</p>
                <p class="text-xl font-bold text-orange-600">
                  {{ kemtiklarMaterialMaydon.toFixed(2) }} m²
                </p>
                <p class="text-xs text-gray-500 mt-1">
                  Kemtiklar ichidagi material
                </p>
              </div>

              <div
                v-if="peregorodkaMaydon > 0"
                class="bg-yellow-50 rounded-lg p-4"
              >
                <p class="text-sm text-gray-600 mb-1">Peregorodka Material</p>
                <p class="text-xl font-bold text-yellow-600">
                  {{ peregorodkaMaydon.toFixed(2) }} m²
                </p>
              </div>
            </div>
          </div>

          <!-- Kemtik va Peregorodka qo'shish -->
          <div v-if="joriyXona" class="grid md:grid-cols-2 gap-6">
            <!-- Kemtik -->
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h3 class="text-lg font-bold text-gray-800 mb-4">
                🔴 Kemtik Qo'shish
              </h3>

              <div class="space-y-3">
                <input
                  v-model="yangiKemtikNom"
                  type="text"
                  placeholder="Kemtik nomi"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                />

                <div class="grid grid-cols-2 gap-2">
                  <input
                    v-model="yangiKemtikUzunlik"
                    type="number"
                    step="0.01"
                    placeholder="Kemtik kengligi (m)"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                  <input
                    v-model="yangiKemtikKenglik"
                    type="number"
                    step="0.01"
                    placeholder="Kemtik uzunligi (m)"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div class="bg-red-50 rounded-lg p-3 space-y-2">
                  <p class="text-xs font-semibold text-gray-700">
                    📍 Pozitsiya (metrda, qaysi qismida turishi)
                  </p>

                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="text-xs text-gray-600"
                        >Xonaning chap qismidan (m) (eni)</label
                      >
                      <input
                        v-model="yangiKemtikX"
                        type="number"
                        min="0"
                        :max="joriyXona ? joriyXona.uzunlik : 100"
                        step="0.01"
                        placeholder="0.00"
                        class="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label class="text-xs text-gray-600"
                        >Xonaning yuqori qismidan (m) (uzunligi)</label
                      >
                      <input
                        v-model="yangiKemtikY"
                        type="number"
                        min="0"
                        :max="joriyXona ? joriyXona.kenglik : 100"
                        step="0.01"
                        placeholder="0.00"
                        class="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>

                  <div v-if="joriyXona" class="bg-white rounded p-2 mt-2">
                    <p class="text-xs font-semibold text-gray-700 mb-1">
                      💡 Misol:
                    </p>
                    <p class="text-xs text-gray-600">
                      Xona: {{ joriyXona.uzunlik }}×{{ joriyXona.kenglik }}m
                    </p>
                    <ul class="text-xs text-gray-600 mt-1 space-y-0.5">
                      <li>• Chap-yuqori: X=0, Y=0</li>
                      <li>
                        • O'ng-yuqori: X={{
                          (
                            joriyXona.uzunlik - (yangiKemtikUzunlik || 0.5)
                          ).toFixed(2)
                        }}, Y=0
                      </li>
                      <li>
                        • Chap-past: X=0, Y={{
                          (
                            joriyXona.kenglik - (yangiKemtikKenglik || 0.5)
                          ).toFixed(2)
                        }}
                      </li>
                      <li>
                        • O'ng-past: X={{
                          (
                            joriyXona.uzunlik - (yangiKemtikUzunlik || 0.5)
                          ).toFixed(2)
                        }}, Y={{
                          (
                            joriyXona.kenglik - (yangiKemtikKenglik || 0.5)
                          ).toFixed(2)
                        }}
                      </li>
                    </ul>
                  </div>
                </div>

                <button
                  @click="kemtikQoshish"
                  class="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition duration-200"
                >
                  Kemtik Qo'shish
                </button>
              </div>

              <div v-if="joriyXona.kemtiklar.length > 0" class="mt-4 space-y-2">
                <h4 class="font-semibold text-gray-700 text-sm">
                  Qo'shilgan kemtiklar:
                </h4>
                <div
                  v-for="kemtik in joriyXona.kemtiklar"
                  :key="kemtik.id"
                  class="flex justify-between items-center bg-red-50 p-2 rounded text-sm"
                >
                  <div>
                    <div class="font-medium">{{ kemtik.nom }}</div>
                    <div class="text-xs text-gray-600">
                      {{ kemtik.uzunlik }}×{{ kemtik.kenglik }}m | X:{{
                        kemtik.x
                      }}m Y:{{ kemtik.y }}m
                    </div>
                  </div>
                  <button
                    @click="kemtikOchirish(kemtik.id)"
                    class="text-red-600 hover:text-red-800 font-bold text-xl"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            <!-- Peregorodka -->
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h3 class="text-lg font-bold text-gray-800 mb-4">
                🟡 Peregorodka Qo'shish
              </h3>

              <div class="space-y-3">
                <input
                  v-model="yangiPeregorodkaNom"
                  type="text"
                  placeholder="Peregorodka nomi"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500"
                />
                <input
                  v-model="yangiPeregorodkaBirinchi"
                  type="number"
                  step="0.01"
                  placeholder="1-tomon (m)"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500"
                />
                <input
                  v-model="yangiPeregorodkaIkkinchi"
                  type="number"
                  step="0.01"
                  placeholder="2-tomon (m)"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500"
                />
                <button
                  @click="peregorodkaQoshish"
                  class="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg transition duration-200"
                >
                  Peregorodka Qo'shish
                </button>
              </div>

              <div
                v-if="joriyXona.peregorodkalar.length > 0"
                class="mt-4 space-y-2"
              >
                <h4 class="font-semibold text-gray-700 text-sm">
                  Qo'shilgan peregorodkalar:
                </h4>
                <div
                  v-for="per in joriyXona.peregorodkalar"
                  :key="per.id"
                  class="flex justify-between items-center bg-yellow-50 p-2 rounded text-sm"
                >
                  <span
                    >{{ per.nom }} ({{ per.birinchiTomon }}m |
                    {{ per.ikkinchiTomon }}m)</span
                  >
                  <button
                    @click="peregorodkaOchirish(per.id)"
                    class="text-yellow-600 hover:text-yellow-800 font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Umumiy hisoblashlar -->
      <div
        v-if="xonalar.length > 0"
        class="bg-white rounded-xl shadow-lg p-6 mt-6"
      >
        <h2 class="text-xl font-bold text-gray-800 mb-4">
          📈 Umumiy Hisoblashlar
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white"
          >
            <p class="text-sm opacity-90 mb-2">Jami Xonalar</p>
            <p class="text-4xl font-bold">{{ xonalar.length }}</p>
          </div>

          <div
            class="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white"
          >
            <p class="text-sm opacity-90 mb-2">Umumiy Xona Maydoni</p>
            <p class="text-4xl font-bold">
              {{ umumiyXonaMaydon.toFixed(2) }} m²
            </p>
          </div>

          <div
            class="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white"
          >
            <p class="text-sm opacity-90 mb-2">Umumiy Material</p>
            <p class="text-4xl font-bold">
              {{ umumiyMaterialMaydon.toFixed(2) }} m²
            </p>
          </div>
        </div>
      </div>

      <!-- Xonadon saqlash -->
      <div
        v-if="xonalar.length > 0"
        class="bg-white rounded-xl shadow-lg p-6 mt-6"
      >
        <h2 class="text-xl font-bold text-gray-800 mb-4">💾 Xonadon Saqlash</h2>

        <div class="grid md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2"
              >Xonadon nomi</label
            >
            <input
              v-model="xonadonNomi"
              type="text"
              placeholder="Masalan: Mening uyim"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2"
              >Xonalarni tanlang</label
            >
            <div
              class="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2"
            >
              <label
                v-for="xona in xonalar"
                :key="xona.id"
                class="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
              >
                <input
                  type="checkbox"
                  :value="xona.id"
                  v-model="tanlangan"
                  class="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span class="text-sm">{{ xona.nom }}</span>
              </label>
            </div>
          </div>
        </div>

        <button
          @click="xonadonSaqlash"
          class="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-md"
        >
          💾 Xonadonni Saqlash
        </button>
      </div>

      <!-- Saqlangan xonadonlar -->
      <div
        v-if="xonadonlar.length > 0"
        class="bg-white rounded-xl shadow-lg p-6 mt-6"
      >
        <h2 class="text-xl font-bold text-gray-800 mb-4">
          📚 Saqlangan Xonadonlar
        </h2>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="xonadon in xonadonlar"
            :key="xonadon.id"
            class="border-2 border-gray-200 rounded-xl p-4 hover:shadow-lg transition duration-200"
          >
            <h3 class="font-bold text-lg text-gray-800 mb-2">
              {{ xonadon.nom }}
            </h3>
            <p class="text-sm text-gray-600 mb-3">
              {{ xonadon.xonalar.length }} ta xona
            </p>
            <div class="flex space-x-2">
              <button
                @click="xonadonYuklash(xonadon)"
                class="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-lg text-sm transition duration-200"
              >
                Yuklash
              </button>
              <button
                @click="xonadonOchirish(xonadon.id)"
                class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition duration-200"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}
</style>
