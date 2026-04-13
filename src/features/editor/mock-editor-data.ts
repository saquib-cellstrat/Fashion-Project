import type {
  HairstyleTemplate,
  ColorSwatch,
  Variation,
  EditorTool,
} from "@/types/editor";

// ─── Tool Definitions ────────────────────────────────────────────
export const editorTools: EditorTool[] = [
  { id: "style", label: "Style", icon: "content_cut" },
  { id: "color", label: "Color", icon: "palette" },
  { id: "length", label: "Length", icon: "straighten" },
  { id: "fade", label: "Fade", icon: "gradient" },
  { id: "texture", label: "Texture", icon: "waves" },
  { id: "3d", label: "3D", icon: "view_in_ar" },
];

// ─── Hairstyle Templates ─────────────────────────────────────────
export const hairstyleTemplates: HairstyleTemplate[] = [
  {
    id: "wolf-cut",
    name: "Wolf Cut",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCl7YaKqrermYtEIaqvc1xEBLn0vdz8AOYSeu6VLh8O2C9mj-HtEpK55xcBXTc4grsHcOTcqu4oFaCv_FysxWlHhQOYq0BqklSZJOZvj9U1y9O97bFv_-hAgPD5jSD-dfUoKTfr3gpJVDyWfOasA6I7gq2TIDsPOA-ZWz_q0h_S4urtPbeh_ABvfk6oXpi8YjdhDbdrqlOchvh7akeVAM1xtiFP2ll5uVfwEYtUwLgbWGZkOAsyKcsuYj4HizJLEXBv2Upr4iO9K1Nv",
    tags: ["Layered", "Voluminous", "Messy"],
    category: "Mens",
  },
  {
    id: "classic-fade",
    name: "Classic Fade",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDz8Y4YOUkGJY2NPPAUoBQ-F9Keky_4zKyTmiXauKildx8l5TN1BWYU0kK_wl0iCyAm5ZLBEOrxGcuj1eh3gauspxgVzWmK5OCoULtzaOqUxZWJuMnWeCKeE8VggHBviBf9PyMXqVtTYEjWQve1g1SHBNIL7TPT_uX_LMUBh8BmupwJfORrvM_P2_78OkZJa1Bh87voP8R_iaIhczSLltP8XOPwakn36N3EAj0T9x6eMYTe8DukQZNtPZdDzIDHCNvuBWpjdjT_7dNQ",
    tags: ["Clean", "Sharp", "Professional"],
    category: "Mens",
  },
  {
    id: "taper-fade",
    name: "Taper Fade",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDp73FUJXvKajn9Uq2ktnckPFWTRU9YIvze-VMiU3JaAoqjuVol6M_8SOlJKn6CInJGoTyED_KVQ-o7xnYOoxrLJPUlMRKQff07kz2VdVndiwZ3oYZ8-13fNYUB3RJpx4p0WfPAQeKA5DGfqhzrVGU4lXyxhBcKUzu31NRVZjKR1l0k-aPDixjdKGwS_h-9jEM8i2DaF3wTrCuLXSnZURPW1deBb2vJTw3OT2lfGqS5eieaB1NcKL-jP5WnMyDdV2zRRMZjtgqi-GE8",
    tags: ["Gradual", "Blended", "Modern"],
    category: "Mens",
  },
  {
    id: "mid-skin-fade",
    name: "Mid Skin Fade",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA8rPHzGwkCsFChUlt_wcrQfmFKnEzdhqaCJ060mQL1NLNJbJr5lZ3KbOiZWOnsmbGAjxCwZOoGSktc3HDmvQxT_K8obt-icDM7O-7bFsDPvhOexCXSD3RZTmfcnvbAC0BUNZ0aKF50bgqyoLg4AGG2MSM8fg1Co9uT-3YJWcxglEqdVm0SwZgQPQGPb-GCVQkqc2NHdUZjX0NwwuS1vPU28e-7CI7RzmyV6l6tdBoLEFeyxYb4_BN7lC_3l_njL0JsLVG0-zqIgyVx",
    tags: ["Bold", "Edgy", "Trendy"],
    category: "Mens",
  },
  {
    id: "buzz-cut",
    name: "Buzz Cut",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAHI7lEULIbOY7JGr4O_aE-HNCaPjIl_lmElDRGVL6DS9qz89-XG3LowFCxDl6XtzWAXLP4OoepX4wggUC8Cv3tXuIPO954OT-dJ6HbgaFLEg6UzaoxWRnrvxpp_nZJFtd0-6F4dQV3rzrc-YxCBoqr34HW8P2Q4BEi07XStFjdG1fG8tOud_uw_YqulKGGE_p9Na_YecgPWv3AZG-alyRWKOLYtKWkzIOZg0IEBUcvWvRbco96uK2I0DKqyFqKHzckvXIv7zrngPae",
    tags: ["Minimal", "Clean", "Military"],
    category: "Short",
  },
  {
    id: "modern-mullet",
    name: "Modern Mullet",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAa9Yc_Z2KUa9XdxtxK9JuYW1YjuLJdAcrb-tLIn5WF9shzbz_emYRiWZW9x-d5IlDXlHbo_4g7craWtKPHxX50QQvo7eoj2TJy5oB5Z_2rnZ2TlcRNA9KtE8Bi-DmQ1RLgnNKZLKxYE4ENFH16g0Rcsj4R01Jjr8uXqrh3SJ51JKnrHCuVbfuTzoeEfgo7kEMY3dNt9nBnvzSkd6ezTUfWVxoCTi1DFt8RMH_X1TyJFhQ9K9OhxM6w2wNpZjl1LrSqaYLHo12w9vrg",
    tags: ["Retro", "Fun", "Party"],
    category: "Mens",
  },
];

// ─── Variations per hairstyle ────────────────────────────────────
export const variationsMap: Record<string, Variation[]> = {
  "wolf-cut": [
    {
      id: "wolf-classic",
      label: "Classic",
      thumbnailUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDz8Y4YOUkGJY2NPPAUoBQ-F9Keky_4zKyTmiXauKildx8l5TN1BWYU0kK_wl0iCyAm5ZLBEOrxGcuj1eh3gauspxgVzWmK5OCoULtzaOqUxZWJuMnWeCKeE8VggHBviBf9PyMXqVtTYEjWQve1g1SHBNIL7TPT_uX_LMUBh8BmupwJfORrvM_P2_78OkZJa1Bh87voP8R_iaIhczSLltP8XOPwakn36N3EAj0T9x6eMYTe8DukQZNtPZdDzIDHCNvuBWpjdjT_7dNQ",
    },
    {
      id: "wolf-side-fade",
      label: "Side Fade",
      thumbnailUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDp73FUJXvKajn9Uq2ktnckPFWTRU9YIvze-VMiU3JaAoqjuVol6M_8SOlJKn6CInJGoTyED_KVQ-o7xnYOoxrLJPUlMRKQff07kz2VdVndiwZ3oYZ8-13fNYUB3RJpx4p0WfPAQeKA5DGfqhzrVGU4lXyxhBcKUzu31NRVZjKR1l0k-aPDixjdKGwS_h-9jEM8i2DaF3wTrCuLXSnZURPW1deBb2vJTw3OT2lfGqS5eieaB1NcKL-jP5WnMyDdV2zRRMZjtgqi-GE8",
    },
    {
      id: "wolf-mid-fade",
      label: "Mid Fade",
      thumbnailUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuA8rPHzGwkCsFChUlt_wcrQfmFKnEzdhqaCJ060mQL1NLNJbJr5lZ3KbOiZWOnsmbGAjxCwZOoGSktc3HDmvQxT_K8obt-icDM7O-7bFsDPvhOexCXSD3RZTmfcnvbAC0BUNZ0aKF50bgqyoLg4AGG2MSM8fg1Co9uT-3YJWcxglEqdVm0SwZgQPQGPb-GCVQkqc2NHdUZjX0NwwuS1vPU28e-7CI7RzmyV6l6tdBoLEFeyxYb4_BN7lC_3l_njL0JsLVG0-zqIgyVx",
    },
    {
      id: "wolf-buzz",
      label: "Buzz Cut",
      thumbnailUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAHI7lEULIbOY7JGr4O_aE-HNCaPjIl_lmElDRGVL6DS9qz89-XG3LowFCxDl6XtzWAXLP4OoepX4wggUC8Cv3tXuIPO954OT-dJ6HbgaFLEg6UzaoxWRnrvxpp_nZJFtd0-6F4dQV3rzrc-YxCBoqr34HW8P2Q4BEi07XStFjdG1fG8tOud_uw_YqulKGGE_p9Na_YecgPWv3AZG-alyRWKOLYtKWkzIOZg0IEBUcvWvRbco96uK2I0DKqyFqKHzckvXIv7zrngPae",
    },
    {
      id: "wolf-taper",
      label: "Modern Taper",
      thumbnailUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAIG8_uPFgRlp6vJRFDXm42kCBeK52W6Uj73LYVxb9ALZgtUGgErDscaRQVNmmsAPqU6cZ7o9Ms6w2zcm4543firXRtRXllSXwQpDbqUNaasPYPmuE0y1R1eQMPOf5LoDDmYmBH7ZVRmyDZbqjCYhk3dCV2sH2NH8LicVey3ucv2sC-kD4m3vODRt2ppTd14W4YmHYxM_HErUbAjieSwmbnSuJ51vJcMfCoiPBuZ7ra10UZnppa7G-bIwvShGVie8csTsSThrMdnOuW",
    },
    {
      id: "wolf-mullet",
      label: "The Mullet",
      thumbnailUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAa9Yc_Z2KUa9XdxtxK9JuYW1YjuLJdAcrb-tLIn5WF9shzbz_emYRiWZW9x-d5IlDXlHbo_4g7craWtKPHxX50QQvo7eoj2TJy5oB5Z_2rnZ2TlcRNA9KtE8Bi-DmQ1RLgnNKZLKxYE4ENFH16g0Rcsj4R01Jjr8uXqrh3SJ51JKnrHCuVbfuTzoeEfgo7kEMY3dNt9nBnvzSkd6ezTUfWVxoCTi1DFt8RMH_X1TyJFhQ9K9OhxM6w2wNpZjl1LrSqaYLHo12w9vrg",
    },
  ],
  "classic-fade": [
    {
      id: "cf-standard",
      label: "Standard",
      thumbnailUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDz8Y4YOUkGJY2NPPAUoBQ-F9Keky_4zKyTmiXauKildx8l5TN1BWYU0kK_wl0iCyAm5ZLBEOrxGcuj1eh3gauspxgVzWmK5OCoULtzaOqUxZWJuMnWeCKeE8VggHBviBf9PyMXqVtTYEjWQve1g1SHBNIL7TPT_uX_LMUBh8BmupwJfORrvM_P2_78OkZJa1Bh87voP8R_iaIhczSLltP8XOPwakn36N3EAj0T9x6eMYTe8DukQZNtPZdDzIDHCNvuBWpjdjT_7dNQ",
    },
    {
      id: "cf-low",
      label: "Low Fade",
      thumbnailUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDp73FUJXvKajn9Uq2ktnckPFWTRU9YIvze-VMiU3JaAoqjuVol6M_8SOlJKn6CInJGoTyED_KVQ-o7xnYOoxrLJPUlMRKQff07kz2VdVndiwZ3oYZ8-13fNYUB3RJpx4p0WfPAQeKA5DGfqhzrVGU4lXyxhBcKUzu31NRVZjKR1l0k-aPDixjdKGwS_h-9jEM8i2DaF3wTrCuLXSnZURPW1deBb2vJTw3OT2lfGqS5eieaB1NcKL-jP5WnMyDdV2zRRMZjtgqi-GE8",
    },
    {
      id: "cf-high",
      label: "High Fade",
      thumbnailUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuA8rPHzGwkCsFChUlt_wcrQfmFKnEzdhqaCJ060mQL1NLNJbJr5lZ3KbOiZWOnsmbGAjxCwZOoGSktc3HDmvQxT_K8obt-icDM7O-7bFsDPvhOexCXSD3RZTmfcnvbAC0BUNZ0aKF50bgqyoLg4AGG2MSM8fg1Co9uT-3YJWcxglEqdVm0SwZgQPQGPb-GCVQkqc2NHdUZjX0NwwuS1vPU28e-7CI7RzmyV6l6tdBoLEFeyxYb4_BN7lC_3l_njL0JsLVG0-zqIgyVx",
    },
  ],
};

// ─── Color Library ───────────────────────────────────────────────
export const colorSwatches: ColorSwatch[] = [
  // Natural Tones
  { id: "deep-espresso", name: "Deep Espresso", hex: "#1a0f0a", group: "natural", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCW1dWUURYKQfe8FcD4F7mfWBSx8nSmDB9S-dDyFOyOdR-8HJXZjR9bxnkXCFOZQdSmRPFQmOqhfNOIq--1n0NBKsImDGnavfHYAeDuLiQqAEZ7HhZBaJMEZ3yj6PMW5zs9qxm2zwJm8fRmWyNQ2Bo17uusnwyna0-vkrs2xQCz3hDPEvnE6A0OEVvTkGccfz6BjEksRqhb2Sz80YDOmfKrfREyaNrThsTphlBNNvo4wTOnzqdt6SWMH17FdxmMdp_ju41xiXkTott4" },
  { id: "chestnut-brown", name: "Chestnut Brown", hex: "#6b3a2a", group: "natural", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAiM9c2YHjVjARuXEoxkjFIkMunn93jbQrWO_YSGXVoQALtrSdsFVOe3bZRUDIPGm733pv3CI9twbp4XwabStM8EizstPhvuo9TQOpbrp7d4U1FsxQCMPgCdjf5qVlCrA3DDG-pqayBSQ_RTu_FBGo_mBEB9JSKa3g7uHHU2ufMIhMoKBAjcepDAx8tAgkA4Ugq69Rico2oMpNa69zvhAiHVRanFlygghoCkAC2AHiCC9ss14kwWe6tBfPphBXymnPzyCKoboCfGd7u" },
  { id: "honey-gold", name: "Honey Gold", hex: "#c9a14b", group: "natural", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCAMAAVn8kprZMSzkUV7YqfuwzyOkYTh-ahy34jwmcaqQuy9zpbLKAzlFfmLIQsaSwua7qM11IQEFnzH-NH9i57SCJIODvzw8ftpON3GOfmF7YUSTODGj8Wi2GlwQIq_K8oVLv2M1jxVa77jecFjxHbR9dY12g_s4f6b4R9i2Am1Zk3jozbfcDyU9ashwbfpqZaHSFE_BJAUsFFEeZLVPnpiBfyIuA3Hplpup-nQ3XiK4LX4Mp_wMEOUEzgaxeXtC2H5xD9jiFdTpY-" },
  { id: "ash-charcoal", name: "Ash Charcoal", hex: "#3d3d3d", group: "natural", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDo3cPshIGiQODD8-5NFWKOzQlmORAHvE_W61kddqWW2tfieTTBp6jeFc1Bbc3aIYUOmvuW4-mW0KxSyebN0KhelehujV9YDr6F2_5U7Uh5OEeajPc6j51u3nhILNxeS9RGqqnrAbM1NB6lKm4OH1hXhmjlroesUcCYZ6U98l00yyj0TIrsXDbMkhu5d3i4q_KN59EHJpTUjBL3kScTxxnLM0kb_-WVgdxQBcp11-Mv0-G8gcI0y4j2N_n9N7ipfZIbkMaBaYKOiub5" },
  { id: "soft-caramel", name: "Soft Caramel", hex: "#b07840", group: "natural", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCKWAeSP5rj6pqIDUhbLhxlPncGEOomz5f-FpfX1fO__WUNa_YjO5E3tgpDjQmG-QuQYa8vhmsav1LOlpzFAXauNbCMRSO8IyDYw7OKsGYaGicAhRymczNhV93-rUwv_SLevVQPKdAIuybqAl0rNL6poB8R--cef39LIt6kgbbsbUARK_EBpsFBTan0SoEhSit7ztHaNksDm2W07oyJq1WmigqDJD9KNXUuN0B5y1-ZuTvusRr8biZioBfJxcdhB4s_UQ68-R5PrgwL" },
  { id: "natural-slate", name: "Natural Slate", hex: "#8c8c8c", group: "natural", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuD8YseMf8miVIExj46GeiDYWP4XBKm-OTzw4OZbQ0QFhQTwb8SmXgE8YBL_Lhh-DMf222gFLPPJgEgvuMi1S_S47qWzAbxkgf327rCmGQxMPy-uLYZ636BUe6y60JkiE9uUDFrI5i-fssSoiFA8QKa5l6X08pCHj9Lz98Keg3akhowX-R7gHlGJdJ99LX94CgCFjv8FCPmrFa0vvF_MRuDcNDvhbVhk146BZRX1H9l8RCmLaWaJXHQtoNPJwM_y-mC5S4bO2aC83Q4p" },
  // Vivid Dyes
  { id: "cyber-blue", name: "Cyber Blue", hex: "#1e90ff", group: "vivid", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuB5PhUZ6agov4YMzjyQpq08Wg-b39fqLK-Frdp-ysmC7-WUZGulygJtF1lSzFqTEBzR39dNW219eJ4MaP0-RCn4iisRq6NjwS2V5mvHoayd_KXbddPhVqWn9s9NbGAWYlP9pyETdd_1uFgm8G4mqmRreE2s1Tmf-o9Hz_Gl0pzrXsvOGtMDJoDdD33R_nRyGXgvfEuy-14nNl6w8MIfRoeQDFwsb5qTRkfsIWKYpShQMz4W0Y9KeqnMp3SldYJ9hRRsf-AuY6VWHLCZ" },
  { id: "magma-red", name: "Magma Red", hex: "#e52020", group: "vivid", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBRWNulkQRh61w1wH_e-EQ_1Guqk9hksqRnK-GdIlYhM8gA8q4KDLQSNit_P5caNa-5E1Yj1Ys3mMrF8VUMU_xguNKULVxiS-nIQMuhiFwTNsVT6kx5eVo_dCux9DUh0IN7phpCZveEv_lQfYwcmmmKt3upk6wj4j_QwVuPfmrQgqDLaCZIrsltCFU9bHAUP65vu-Z5BvNjQDxt1kuzQqM2y4tssUB6fWztqTwq32PA_jXDJ6U3byc9W50fOv3tQ1xN24qmKvcdAVOf" },
  { id: "deep-iris", name: "Deep Iris", hex: "#6a0dad", group: "vivid", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBmlo9_XsOTCAb5D4KOYiWTgk6ynJF8kOdMt03NtBNOq7NdLSYVtreBREjwWkZ2txNTUj_1w4SVUP9y576E8M8tqLj3k5oiT4Hp3vCz3fGmBfGSEBtr6tw-kNftftkywPFj7GhgW-pKfE3LoA0WGnp8hKsEBGAp4DLMEka5rbsvwnW3vwJdM9ixbL3Qkb-m4o4Nk3Yr3wmMCH2hpZOU80lyBLbCIofKGjgrw8W88ah4aNro-XFSTSwpYKUpgQJbrIVCuxh5yg7JBj_g" },
  { id: "neon-lime", name: "Neon Lime", hex: "#a3e635", group: "vivid", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCdXlZl_txeo_oKkgkuX4WbLOkPqP-ZCqQZffFNg4AAbAbvLxk1lNFJ9pVZ2q6wXP9pakSm3um3b3QGGKhaFYi4lZjyIN0mp_uArBZbpQW3lN6OpKLC4nhghWd6Hq0HNnP04nCrMnUzoUfYAUaoAadavvr2RHDBh0lX12geiv0tnBH1c9rI27F_lU1UqRj8Q-W1sPcxvcjtjEqrqR8R-HKeac_3gM6IkzrI_IWHg2C20-3QYf5o4_92nmXH0rPSMloLXSfInlloisnr" },
  { id: "hot-fuschia", name: "Hot Fuschia", hex: "#ff00ff", group: "vivid", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCugEu-J1NAVPNcVpN2ZHcbxr85vhVZ7QjMcgmF35zfx7Z7AsY_PL5bf6IFDYkNLtCIpq2c7eNOowv0KkBnFtuP0S3iqjgriThU78vGIYy7Ndtq6vgmMDCsscUKvMHqb-iekwuXSfeQiDgYm5WmULRtUIE5l8oR5GAUgGrt2f6M80ei0xugJb0O_28hFvFKrTFo2iSuR_wT6XTIlBjGZfRcv321ihfiVcilDuwwo7wbdx0w8q1PeFeMFBMyK42rcNaHhYQ-C7iQOHeo" },
  { id: "teal-surge", name: "Teal Surge", hex: "#00b4d8", group: "vivid", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuD_7PwD_s2PsadJVfRHCWVjURdtV9e7CZCZNSesjHsRDr_B4VVnPq0zDzJY81exXuDwYnqJRlpdH63DFxMgkM5lHaeWsDUdmWIfTmc9yRdeqVqnWAkRqAZWLivOBUBQ1KvcYP2CBwMnyKj6lCy20Hv_AOcosxfh4RfOEiNOn6vDZ-7Wz8rvlpGdQpQBX3W27rEf02RkBaOtpncREtUpEJky13vMUOHR0HuN5qhdKHv_ilCXAb7IpB1yKaYvmEcpa6DD-SysCIVB1dqy" },
  // Subtle Pastels
  { id: "soft-lilac", name: "Soft Lilac", hex: "#c8a2c8", group: "pastel", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCRb1_z1gGjeSTx8-4vNeSqpZz1d1KO0EAKu0c8UeKu0aNV5oLAH0NYg6PAug1Fnz8OE48ZzdBUa2yMZy7RyJvR13YenGDdF39rWKHO0WxzVAEntWgrB0YxxVjZMWUPFAk2aDgF8rp5x2wrEjgqDBBH0dMhmjIpvP-P4EOfw67lfDUTm79EnQtiLyOY8uB-LjUF3fd7o8whPNuSP7PNXc-5jjfs3w4d38Vz78r4zYuZ6PWuzAk7O3C-LP9xKRWmify_byCzDfTbX3o8" },
  { id: "candy-mint", name: "Candy Mint", hex: "#aaf0d1", group: "pastel", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDtVuW6eyxs7Pb7pWIi2SZJq9t7UYHO6DRuPkNPqC16uB3VXa08WycQaebvFfMVCW-N6tcePe_H0oeFWKffODa0Vu5J5X3J4ErzHrlmBMornF2IKKYHyPu5X2rgMjG7qwnghrpF0f5rVXNaLuDH3vpHm2x2uNneQBXThBnv5nESiK1FV4nYJP88cjaYtXEpC2NJ4oJK8bmf8xJ0gG4Wi4oaqTbOiXcHZXeoljkP62c5U6BSkhPfAVDcs2r9iynkuuFeCUlCBhpCCx76" },
  { id: "dusty-peach", name: "Dusty Peach", hex: "#f4a582", group: "pastel", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDWOM0Qv33ozjd-XQyz7fNXtWWM2lP294XWIh30NdNDM0s9UepyqokwTUJvl_p7mNGSi4ESSbdML2ZB704JzBf_IvNAVEP5Q9BUNb40_1Jj0N22pJUG_c7-xo_RwuRFywDkIqU69inX_sMCq-AcB6ODlblLGv1hppdfo4C0T10jC8PGaeSNl-27R1rNVqxcW6BuyAljThDhBcRM7-bh-7t6E4W8qymbhI0gB2WsXbfUGUwkfpXjBUIi6_jHMsOakA9VFyWPK1Y5K2zU" },
];

// ─── Default active states ───────────────────────────────────────
export const defaultHairstyleId = "wolf-cut";
export const defaultVariationId = "wolf-classic";
export const defaultColorId = "deep-espresso";

// ─── Trending Posts ──────────────────────────────────────────────
export type TrendingPost = {
  id: string;
  imageUrl: string;
  author: string;
  likes: string;
};

export const trendingPosts: TrendingPost[] = [
  {
    id: "trend-1",
    author: "@style_king",
    likes: "2.4k",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD9V8pCtxvdaMi2EHVE_OMLoDQsTv0VxkKivWVlUyXKQ3dNov3WpCM6aWwvANlpjoV5lth6aoOZqEsKu3Vo8TMKBf7oZ-_muJM3FXEEHjwyXLMclo_-VrMpHwgDYImDontr2TbTdmiY6MyFuMlwYlzUXZYWHvtsoVmhpoGIE2kKohS-OBm9wWbrBWd3V1bOxqY_raZFy03DyswpjANAspgwMVmbAfi1vcfFj-Po7ZHjRnSDmBgotHJwVFwIdadgZTFIyYnOF3CAAgPx",
  },
  {
    id: "trend-2",
    author: "@vibe_maker",
    likes: "1.8k",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBs9boCXbaNuhHaXbZbIxSS-AxC4O-Yb9LTrjORjuXJ1Zxoec5RewA_rd3U7AQe1at_nKuodS1tSAYrLotZTvOcgg8eXKCE9Nl8PZFyj8MWXAUKbHGcKqgLm3gdLuLF_-43k31l2GUdC5S0qXSZXfT3Vhl_YF46_QUZCysDq3Pm9jNpzDePPuSxhQh3fvPqCULI98BEa-jWC7Xd8gvmyv1KrBy1xrOAKR57OldINXhzsyPvgmiwFtNvh3p2YJHQ4v0nWCmnqzqTVei3",
  },
  {
    id: "trend-3",
    author: "@cut_guru",
    likes: "3.1k",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDeFXz5mYgH1D3o8FMzQQilbb1HNt3Ztfnh1AAhPvPGE-YI0wubTUtavm3GZPuvZnzq8YwYzXgykIZ0nMQfDZre3du4IvFDlQQ-K1XxAK066oj6ZTniK51jZzGqbwmutDWePj2ENq9ta3xI_bkGpQ7vJ0h6PyVmXiLacKirBxptIM8b8i1b5Ik4itaGl4rJu__tdWyxsYlHNibK7G_meUKCwWjov38Z9QkEpdGDHeE8A9UbOGO2Z9a3lSrwn4Pb2QM35wvfINpFSzzt",
  },
  {
    id: "trend-4",
    author: "@nova_sky",
    likes: "4.5k",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDFZEPCrgD98lXiXQNUj4r1mVf-SPeP1A7ebG6HbFvysGPtCtJEG64NRv1booGZqd3CHKcFD0Yv9AUfHyia5nazMcu1UXgLynG6fwEEi-3YBFIN38W0sMgePUF2N7wiPEyoM0c30L5vtRV23koqwr08DoMXFNsr2_Ag3L1r5VTC7C_gU2beUzO4aBlF8l51-YcctuwViaYNaDFqA4B2_QgtmCFgA81gMjwyybr5k6xTkLiBBYos_FtERLBsbZw_gCmZDX5j0v1pR7MU",
  },
];

// ─── Challenges ──────────────────────────────────────────────────
export type Challenge = {
  id: string;
  title: string;
  description: string;
  participants: string;
  endsIn: string;
  progress?: number;
  featured?: boolean;
};

export const challenges: Challenge[] = [
  {
    id: "neon-buzz",
    title: 'The "Neon Buzz" Challenge',
    description: "Create the most eye-catching neon buzz cut.",
    participants: "4.2k",
    endsIn: "5 days",
    featured: true,
  },
  {
    id: "silver-lining",
    title: "Silver Lining Contest",
    description: "Best platinum fade transitions.",
    participants: "1.8k",
    endsIn: "2 days",
    progress: 66,
  },
  {
    id: "retro-wave",
    title: "Retro Wave Revival",
    description: "Bring back 80s hairstyle vibes.",
    participants: "920",
    endsIn: "4 days",
    progress: 35,
  },
];

