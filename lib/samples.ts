export interface SampleImage {
  name: string;
  url: string;
  contentHash: string;
}

export interface SampleSet {
  slug: string;
  /** Display name for the image set (shown in dashboard) */
  displayName: string;
  /** Prompt text shown in the CaptchaWidget header */
  name: string;
  images: SampleImage[];
  /** Content hashes of the correct images for demo grading */
  correctHashes: string[];
}

export const SAMPLE_SETS: SampleSet[] = [
  {
    slug: "tech-stacks",
    displayName: "Tech Stacks",
    name: "Frontend Toolchains",
    correctHashes: [
      "051985f8c734ed09f545745f09bd867984e5932bd9f15b6f14a49bad76a3e71f", // bun
      "f7b6407151cbfcc1db29a2e7f8706e970eacd694b708399e349552d2c2fc6ff3", // nextjs
      "0307336e328e4d108514b67861095df055f1fbcd7d984d270237c5dbdc105faa", // nodejs
      "974e53c7a6602e0be8d62013f59a26d0d1186391fe6ded24375908eccd8c57fe", // react
      "0b7c3bc6a19b7a5bf502902e564ecd7317b569f167f8bf6b7f6d4d6faa6b18d4", // tailwindcss
      "72a563a66f6b04cbc8c6a693d46f9f5a76a7745c7bdc1ff4f6d5a8215302a8b4", // typescript
      "2f440b4ac4ed9630212a9edd98758156274e614ba7140ff71333ce65c312b92a", // vue
    ],
    images: [
      {
        name: "bun",
        url: "https://r2.ycaptcha.xyspg.moe/samples/logos/051985f8c734ed09f545745f09bd867984e5932bd9f15b6f14a49bad76a3e71f.webp",
        contentHash:
          "051985f8c734ed09f545745f09bd867984e5932bd9f15b6f14a49bad76a3e71f",
      },
      {
        name: "docker",
        url: "https://r2.ycaptcha.xyspg.moe/samples/logos/fe1c9fb267901cabc90a43dfa047ce37c820889f3a820ed9199c5dfa26da7bf2.webp",
        contentHash:
          "fe1c9fb267901cabc90a43dfa047ce37c820889f3a820ed9199c5dfa26da7bf2",
      },
      {
        name: "mysql",
        url: "https://r2.ycaptcha.xyspg.moe/samples/logos/ecffba113c993b61ebb8fcb640e43c031cc46cbb9e4e4ba24c6c7a98618cc200.webp",
        contentHash:
          "ecffba113c993b61ebb8fcb640e43c031cc46cbb9e4e4ba24c6c7a98618cc200",
      },
      {
        name: "nextjs",
        url: "https://r2.ycaptcha.xyspg.moe/samples/logos/f7b6407151cbfcc1db29a2e7f8706e970eacd694b708399e349552d2c2fc6ff3.webp",
        contentHash:
          "f7b6407151cbfcc1db29a2e7f8706e970eacd694b708399e349552d2c2fc6ff3",
      },
      {
        name: "nodejs",
        url: "https://r2.ycaptcha.xyspg.moe/samples/logos/0307336e328e4d108514b67861095df055f1fbcd7d984d270237c5dbdc105faa.webp",
        contentHash:
          "0307336e328e4d108514b67861095df055f1fbcd7d984d270237c5dbdc105faa",
      },
      {
        name: "postgresql",
        url: "https://r2.ycaptcha.xyspg.moe/samples/logos/fa5d8315f3c12c15edfce4966f80def3d00bfc2fd76c8ae8fc3e4cd328c0a786.webp",
        contentHash:
          "fa5d8315f3c12c15edfce4966f80def3d00bfc2fd76c8ae8fc3e4cd328c0a786",
      },
      {
        name: "python",
        url: "https://r2.ycaptcha.xyspg.moe/samples/logos/694c9f0f645453dc5ddc4b762e2cebcc93c445d677e0c156e93c6f9937ed3c82.webp",
        contentHash:
          "694c9f0f645453dc5ddc4b762e2cebcc93c445d677e0c156e93c6f9937ed3c82",
      },
      {
        name: "react",
        url: "https://r2.ycaptcha.xyspg.moe/samples/logos/974e53c7a6602e0be8d62013f59a26d0d1186391fe6ded24375908eccd8c57fe.webp",
        contentHash:
          "974e53c7a6602e0be8d62013f59a26d0d1186391fe6ded24375908eccd8c57fe",
      },
      {
        name: "redis",
        url: "https://r2.ycaptcha.xyspg.moe/samples/logos/cf48ab66c2f663eaba2b40cfc4e50ee02ca095a9241dcbb847d7531bfa699377.webp",
        contentHash:
          "cf48ab66c2f663eaba2b40cfc4e50ee02ca095a9241dcbb847d7531bfa699377",
      },
      {
        name: "spring",
        url: "https://r2.ycaptcha.xyspg.moe/samples/logos/83861eabdfee1c528f1286def4effa59c004727d03d46154763d2cfe937cad94.webp",
        contentHash:
          "83861eabdfee1c528f1286def4effa59c004727d03d46154763d2cfe937cad94",
      },
      {
        name: "tailwindcss",
        url: "https://r2.ycaptcha.xyspg.moe/samples/logos/0b7c3bc6a19b7a5bf502902e564ecd7317b569f167f8bf6b7f6d4d6faa6b18d4.webp",
        contentHash:
          "0b7c3bc6a19b7a5bf502902e564ecd7317b569f167f8bf6b7f6d4d6faa6b18d4",
      },
      {
        name: "typescript",
        url: "https://r2.ycaptcha.xyspg.moe/samples/logos/72a563a66f6b04cbc8c6a693d46f9f5a76a7745c7bdc1ff4f6d5a8215302a8b4.webp",
        contentHash:
          "72a563a66f6b04cbc8c6a693d46f9f5a76a7745c7bdc1ff4f6d5a8215302a8b4",
      },
      {
        name: "vue",
        url: "https://r2.ycaptcha.xyspg.moe/samples/logos/2f440b4ac4ed9630212a9edd98758156274e614ba7140ff71333ce65c312b92a.webp",
        contentHash:
          "2f440b4ac4ed9630212a9edd98758156274e614ba7140ff71333ce65c312b92a",
      },
    ],
  },
  {
    slug: "maimai",
    displayName: "maimai",
    name: "14.9",
    correctHashes: [
      "41d408a6afa54f3392b64b09cf3aa92787c1152a15a27cd5ab73b06199097b16", // 16
      "65185a477a70b30e0c97e9f6c01c4268b3393ad29a32864b86b1722f427e6371", // 17
      "22a5dc275b2dfa1ec6d405db11a15cc53fcb6e4121ff88f6ef2fd942def5130f", // 18
      "86b3d09164863ce269bcd713621ef34111927144e89bca5d46f40036dd45d27a", // 19
      "ceca18899fca2040d6a83563e7f1eeff57b27d70cfae69b4961357f26af1c79e", // 20
    ],
    images: [
      {
        name: "1",
        url: "https://r2.ycaptcha.xyspg.moe/samples/maimai_CAPTCHA/7e2614d0d31f9ea9b0132ca05539226197fa9b6d5ca6db32320fc22acb5e7836.webp",
        contentHash:
          "7e2614d0d31f9ea9b0132ca05539226197fa9b6d5ca6db32320fc22acb5e7836",
      },
      {
        name: "2",
        url: "https://r2.ycaptcha.xyspg.moe/samples/maimai_CAPTCHA/5395d1e3ce448ed817833fd92fd6dce3c9bfa0d7f4fa3b32d6e620adbd3f8faf.webp",
        contentHash:
          "5395d1e3ce448ed817833fd92fd6dce3c9bfa0d7f4fa3b32d6e620adbd3f8faf",
      },
      {
        name: "3",
        url: "https://r2.ycaptcha.xyspg.moe/samples/maimai_CAPTCHA/04e0eb81f5be4cd21feb201e54969d55f58c7840e86fd52a13c6d474a0eb8bec.webp",
        contentHash:
          "04e0eb81f5be4cd21feb201e54969d55f58c7840e86fd52a13c6d474a0eb8bec",
      },
      {
        name: "4",
        url: "https://r2.ycaptcha.xyspg.moe/samples/maimai_CAPTCHA/88068fa7204a78f8ab6fa4dfea45b776444cb91ed6c2fbc8a664d8411f7524ed.webp",
        contentHash:
          "88068fa7204a78f8ab6fa4dfea45b776444cb91ed6c2fbc8a664d8411f7524ed",
      },
      {
        name: "5",
        url: "https://r2.ycaptcha.xyspg.moe/samples/maimai_CAPTCHA/af12aab7159735cadd84924ebb1785d2f94823c0f178a9f884134ea479af3f19.webp",
        contentHash:
          "af12aab7159735cadd84924ebb1785d2f94823c0f178a9f884134ea479af3f19",
      },
      {
        name: "6",
        url: "https://r2.ycaptcha.xyspg.moe/samples/maimai_CAPTCHA/cae7f73fb21a8dc4737b25c1f13d5e5d53f02e173bc2e92e9e6a056ac5b34fdf.webp",
        contentHash:
          "cae7f73fb21a8dc4737b25c1f13d5e5d53f02e173bc2e92e9e6a056ac5b34fdf",
      },
      {
        name: "7",
        url: "https://r2.ycaptcha.xyspg.moe/samples/maimai_CAPTCHA/4b86f979485cdd17c322bdf6056ccf5dd892d991cceb052df8481f7ad20ca332.webp",
        contentHash:
          "4b86f979485cdd17c322bdf6056ccf5dd892d991cceb052df8481f7ad20ca332",
      },
      {
        name: "8",
        url: "https://r2.ycaptcha.xyspg.moe/samples/maimai_CAPTCHA/d1e12deae2354db89c8ca56de237934a8afa928087b853680101a6c578caf9b3.webp",
        contentHash:
          "d1e12deae2354db89c8ca56de237934a8afa928087b853680101a6c578caf9b3",
      },
      {
        name: "9",
        url: "https://r2.ycaptcha.xyspg.moe/samples/maimai_CAPTCHA/0f42e62248e8f9754e49eb91ba5f7496acdd9f0c2f03182d318620d17ce54d0b.webp",
        contentHash:
          "0f42e62248e8f9754e49eb91ba5f7496acdd9f0c2f03182d318620d17ce54d0b",
      },
      {
        name: "10",
        url: "https://r2.ycaptcha.xyspg.moe/samples/maimai_CAPTCHA/1f20481af7a1de1918704d8decb3136cd5ac343299d4254dd1d2cd260591c9ef.webp",
        contentHash:
          "1f20481af7a1de1918704d8decb3136cd5ac343299d4254dd1d2cd260591c9ef",
      },
      {
        name: "11",
        url: "https://r2.ycaptcha.xyspg.moe/samples/maimai_CAPTCHA/6b6f85460fd6be7c79f261ce8d05ceefa2e04945caa3fc7e2ce6c7beb7e60525.webp",
        contentHash:
          "6b6f85460fd6be7c79f261ce8d05ceefa2e04945caa3fc7e2ce6c7beb7e60525",
      },
      {
        name: "12",
        url: "https://r2.ycaptcha.xyspg.moe/samples/maimai_CAPTCHA/6fd6cec0cbf9c3b96d589c24ee3da2697e4fdf8c592b28d392670321b25f9654.webp",
        contentHash:
          "6fd6cec0cbf9c3b96d589c24ee3da2697e4fdf8c592b28d392670321b25f9654",
      },
      {
        name: "13",
        url: "https://r2.ycaptcha.xyspg.moe/samples/maimai_CAPTCHA/4381b899759318719c858c438b075160c791596aa3755371dd4b4fc6b13cff6b.webp",
        contentHash:
          "4381b899759318719c858c438b075160c791596aa3755371dd4b4fc6b13cff6b",
      },
      {
        name: "14",
        url: "https://r2.ycaptcha.xyspg.moe/samples/maimai_CAPTCHA/f474f147a25bd6f21072699f2ac651da0399c384e55b476176194a685863a4f9.webp",
        contentHash:
          "f474f147a25bd6f21072699f2ac651da0399c384e55b476176194a685863a4f9",
      },
      {
        name: "15",
        url: "https://r2.ycaptcha.xyspg.moe/samples/maimai_CAPTCHA/3e08a9b79f5fbbe1f8e7f6a03f12009a8c9351f3b85f0a1847b7af658179720d.webp",
        contentHash:
          "3e08a9b79f5fbbe1f8e7f6a03f12009a8c9351f3b85f0a1847b7af658179720d",
      },
      {
        name: "16",
        url: "https://r2.ycaptcha.xyspg.moe/samples/maimai_CAPTCHA/41d408a6afa54f3392b64b09cf3aa92787c1152a15a27cd5ab73b06199097b16.webp",
        contentHash:
          "41d408a6afa54f3392b64b09cf3aa92787c1152a15a27cd5ab73b06199097b16",
      },
      {
        name: "17",
        url: "https://r2.ycaptcha.xyspg.moe/samples/maimai_CAPTCHA/65185a477a70b30e0c97e9f6c01c4268b3393ad29a32864b86b1722f427e6371.webp",
        contentHash:
          "65185a477a70b30e0c97e9f6c01c4268b3393ad29a32864b86b1722f427e6371",
      },
      {
        name: "18",
        url: "https://r2.ycaptcha.xyspg.moe/samples/maimai_CAPTCHA/22a5dc275b2dfa1ec6d405db11a15cc53fcb6e4121ff88f6ef2fd942def5130f.webp",
        contentHash:
          "22a5dc275b2dfa1ec6d405db11a15cc53fcb6e4121ff88f6ef2fd942def5130f",
      },
      {
        name: "19",
        url: "https://r2.ycaptcha.xyspg.moe/samples/maimai_CAPTCHA/86b3d09164863ce269bcd713621ef34111927144e89bca5d46f40036dd45d27a.webp",
        contentHash:
          "86b3d09164863ce269bcd713621ef34111927144e89bca5d46f40036dd45d27a",
      },
      {
        name: "20",
        url: "https://r2.ycaptcha.xyspg.moe/samples/maimai_CAPTCHA/ceca18899fca2040d6a83563e7f1eeff57b27d70cfae69b4961357f26af1c79e.webp",
        contentHash:
          "ceca18899fca2040d6a83563e7f1eeff57b27d70cfae69b4961357f26af1c79e",
      },
    ],
  },
  {
    slug: "subway",
    displayName: "Subway Trains",
    name: "Stops at Times Square",
    correctHashes: [
      "2326c8c9bd6a91c7ba78c5c9aefeb7784c2627604607423cca91d5071209a63f", // 1
      "080fe01a6d4a3b73dcd69e732a57a2574717cefe6e2914077302b89217e9387e", // 3
      "51dd0617c13d6c7d8e48fb18846a0f5460aebc31f318e713bea3a425e0f13fcd", // 7
      "25600d3f25b8bf98ef760d5e02f9e76a551ab87d4624449de7e6751ac613ec37", // N
      "3bbf3fb3ee2ddc925d78f1692d1748e2b512c425974e97604b75158810c311b1", // Q
      "7dc4e6113444bf1781696e027a3547bf03d2245bb9be77cea3e601b71e5211f8", // W
    ],
    images: [
      {
        name: "1",
        url: "https://r2.ycaptcha.xyspg.moe/samples/subway/2326c8c9bd6a91c7ba78c5c9aefeb7784c2627604607423cca91d5071209a63f.webp",
        contentHash:
          "2326c8c9bd6a91c7ba78c5c9aefeb7784c2627604607423cca91d5071209a63f",
      },
      {
        name: "3",
        url: "https://r2.ycaptcha.xyspg.moe/samples/subway/080fe01a6d4a3b73dcd69e732a57a2574717cefe6e2914077302b89217e9387e.webp",
        contentHash:
          "080fe01a6d4a3b73dcd69e732a57a2574717cefe6e2914077302b89217e9387e",
      },
      {
        name: "6",
        url: "https://r2.ycaptcha.xyspg.moe/samples/subway/6f44f353eb21d73272a4c4801a0f6d31f986b48997f9162df719484db1d93102.webp",
        contentHash:
          "6f44f353eb21d73272a4c4801a0f6d31f986b48997f9162df719484db1d93102",
      },
      {
        name: "7",
        url: "https://r2.ycaptcha.xyspg.moe/samples/subway/51dd0617c13d6c7d8e48fb18846a0f5460aebc31f318e713bea3a425e0f13fcd.webp",
        contentHash:
          "51dd0617c13d6c7d8e48fb18846a0f5460aebc31f318e713bea3a425e0f13fcd",
      },
      {
        name: "A",
        url: "https://r2.ycaptcha.xyspg.moe/samples/subway/8a1cea76ccd83a2dff0e72a232eed6da1a31f3c039244885a0878e5043ce5735.webp",
        contentHash:
          "8a1cea76ccd83a2dff0e72a232eed6da1a31f3c039244885a0878e5043ce5735",
      },
      {
        name: "E",
        url: "https://r2.ycaptcha.xyspg.moe/samples/subway/6e5d0b0f7adc7d15d07339744d92345e8d6c12e559cc3454c5e1233b30cebac4.webp",
        contentHash:
          "6e5d0b0f7adc7d15d07339744d92345e8d6c12e559cc3454c5e1233b30cebac4",
      },
      {
        name: "F",
        url: "https://r2.ycaptcha.xyspg.moe/samples/subway/3413ff8e845b9a13c1a0a1f58200bd48c74e7357e38d540409010199c6c6bfef.webp",
        contentHash:
          "3413ff8e845b9a13c1a0a1f58200bd48c74e7357e38d540409010199c6c6bfef",
      },
      {
        name: "G",
        url: "https://r2.ycaptcha.xyspg.moe/samples/subway/649c5964ef0c273b5e7ccefc4d2ff43010b8b819e611d1ceb0f86dd7924bd862.webp",
        contentHash:
          "649c5964ef0c273b5e7ccefc4d2ff43010b8b819e611d1ceb0f86dd7924bd862",
      },
      {
        name: "J",
        url: "https://r2.ycaptcha.xyspg.moe/samples/subway/2661b1441ffdfe53a1cc1fded9ca67aff27fe3edea37bc2f51d211bcb2e8825d.webp",
        contentHash:
          "2661b1441ffdfe53a1cc1fded9ca67aff27fe3edea37bc2f51d211bcb2e8825d",
      },
      {
        name: "M",
        url: "https://r2.ycaptcha.xyspg.moe/samples/subway/bde57c698f4e5258806f41e18111b9ba6d94b8d43a4402511ee245ab5c355c98.webp",
        contentHash:
          "bde57c698f4e5258806f41e18111b9ba6d94b8d43a4402511ee245ab5c355c98",
      },
      {
        name: "N",
        url: "https://r2.ycaptcha.xyspg.moe/samples/subway/25600d3f25b8bf98ef760d5e02f9e76a551ab87d4624449de7e6751ac613ec37.webp",
        contentHash:
          "25600d3f25b8bf98ef760d5e02f9e76a551ab87d4624449de7e6751ac613ec37",
      },
      {
        name: "Q",
        url: "https://r2.ycaptcha.xyspg.moe/samples/subway/3bbf3fb3ee2ddc925d78f1692d1748e2b512c425974e97604b75158810c311b1.webp",
        contentHash:
          "3bbf3fb3ee2ddc925d78f1692d1748e2b512c425974e97604b75158810c311b1",
      },
      {
        name: "SI",
        url: "https://r2.ycaptcha.xyspg.moe/samples/subway/b2bc5036b6535fb6a8a577c07d6b6942ffadfe8ed7d79da2d8fb45ed79a3ac8e.webp",
        contentHash:
          "b2bc5036b6535fb6a8a577c07d6b6942ffadfe8ed7d79da2d8fb45ed79a3ac8e",
      },
      {
        name: "W",
        url: "https://r2.ycaptcha.xyspg.moe/samples/subway/7dc4e6113444bf1781696e027a3547bf03d2245bb9be77cea3e601b71e5211f8.webp",
        contentHash:
          "7dc4e6113444bf1781696e027a3547bf03d2245bb9be77cea3e601b71e5211f8",
      },
      {
        name: "Yamanote",
        url: "https://r2.ycaptcha.xyspg.moe/samples/subway/04bc1e77cf825ce78a2660b62e9fd104bbd7b71d491849a21ebea1d6f06116eb.webp",
        contentHash:
          "04bc1e77cf825ce78a2660b62e9fd104bbd7b71d491849a21ebea1d6f06116eb",
      },
    ],
  },
];
