# 演示子集：出处与许可

本文件说明 `demos/glyphs/` 与 `demos/data/` 里**每一份材料**从哪来、什么许可、发布时必须写什么。

子集由 `node tools/build_demo_glyphs.ts` 生成，**可复跑、可逐字节核对**。

上游是兄弟仓 [`hanzi-glyphs-svg`](https://github.com/zhouyongh/hanzi-glyphs-svg)，本仓用 `tools/sync_glyphs.ts` 同步到本地 `assets/`（已 gitignore）；本子集是**从那份同步结果里挑出来的少量字形**，不是重新抓取的。

## 一、总览

| 书体 | 字形数 | 其中「部首附带」 | 字节 |
|---|---:|---:|---:|
| 甲骨文（`oracle`） | 20 | 0 | 14.6 KB |
| 金文（`bronze`） | 20 | 0 | 61.7 KB |
| 篆书（`seal`） | 27 | 7 | 80.5 KB |
| 隶书（`clerical`） | 20 | 0 | 66.5 KB |

「部首附带」指**为了演示页能算部首而额外收进来的说文部首字形**——演示页按部首码位直接取字形（`loadGlyph("seal", radicalCp + ".svg")`），不收这一步会断在半路。它们与正文字形同源同许可。

## 二、逐层出处与许可

### 甲骨文（`oracle`）

- **来源**：兄弟仓 `hanzi-glyphs-svg` 的 `glyphs/oracle/` 层
- **本仓的许可立场**：**CC BY 4.0**——使用须署名作者与数据集，并注明是否作过修改。

#### 许可：CC-BY-4.0

- **上游数据集**：`Oracle Bone Glyphs: Parametric Vector Dataset (v0.3)`
- **协议全文**：<https://creativecommons.org/licenses/by/4.0/>
- **上游取回时刻**：2026-10-05T09:01:54Z ～ 2026-10-05T09:01:54Z（逐文件记录见下表）

**发布时必须署名的文字**（逐字照抄，CC BY 4.0 §3(a)(1)(A)）：

```
Li, Qing-sheng & Bian, Yu-lin (2026), 'Oracle Bone Glyphs: Parametric Vector Dataset (v0.3)', doi:10.5281/zenodo.22467946
```

**改动声明**

- *上游（兄弟仓 `hanzi-glyphs-svg`）入库时的改动*：none (byte-identical copy)
- *本子集*：**没有作任何修改**——字形是上游文件的逐字节副本，本仓只做了「挑选 + 换目录 + 写索引」这一层，不触及字形内容。

**收录的字（20 个）**：明 天 日 好 如 河 水 未 月 山 木 目 火 田 人 大 鱼 口 禾 女

| 现代字 | 文件 | 上游出处 | 上游 sha256 |
|---|---|---|---|
| 明 | `0518.svg` | https://zenodo.org/records/22467946 （data/svg_polyline/0518.svg） | `d935b981f2743334e22ee8486aedc035e00e40d35ea3cc693accd039e6119202` |
| 天 | `0003.svg` | https://zenodo.org/records/22467946 （data/svg_polyline/0003.svg） | `e10aa98d5ea19e25ec0871659583bc014ac0b8dbea60f6625ba8eaecc9912f92` |
| 日 | `0495.svg` | https://zenodo.org/records/22467946 （data/svg_polyline/0495.svg） | `bfef279e54b30c87d91ae5296347bcd0211507e9f61c2e78c940010170714706` |
| 好 | `0887.svg` | https://zenodo.org/records/22467946 （data/svg_polyline/0887.svg） | `3c032d6b06a192e3a22ee037bf3feb89ce476ac726f27d215b513534a6b2ec3a` |
| 如 | `0891.svg` | https://zenodo.org/records/22467946 （data/svg_polyline/0891.svg） | `e4308beb9cb8f0877944e4503c3362f81ad37d99258674205e4bde03adb43628` |
| 河 | `0773.svg` | https://zenodo.org/records/22467946 （data/svg_polyline/0773.svg） | `1c34e828686305ea14f748210569e5b5eaf19fc6df32bf4fd9f49a0e5a864086` |
| 水 | `0772.svg` | https://zenodo.org/records/22467946 （data/svg_polyline/0772.svg） | `eb179fdabc070491bee006cfef4d206d1b1ebaa4f7484fa536e4ddcb5bc5c97a` |
| 未 | `1049.svg` | https://zenodo.org/records/22467946 （data/svg_polyline/1049.svg） | `123982f74ddbe8bcc9a327d2798c9ef60198d65e1713cfbde38329c540d03ae9` |
| 月 | `0515.svg` | https://zenodo.org/records/22467946 （data/svg_polyline/0515.svg） | `ad8101c4733d929902b64438a35be8a0840af68155b31d9b2f9f5184b53ce588` |
| 山 | `0678.svg` | https://zenodo.org/records/22467946 （data/svg_polyline/0678.svg） | `62149698dac22652cc1e4a0a5302e4e3f7fca8e370c35c830696cb20932bc837` |
| 木 | `0428.svg` | https://zenodo.org/records/22467946 （data/svg_polyline/0428.svg） | `fe1ca8f77edb50f293df5bfd7751e5e6ff752ce70ff5da0eeb2e359eb09ee603` |
| 目 | `0259.svg` | https://zenodo.org/records/22467946 （data/svg_polyline/0259.svg） | `e02ac28ef1019e80d139063e5c9830f5531926b17818aa8f67adfb43d9e1f14a` |
| 火 | `0732.svg` | https://zenodo.org/records/22467946 （data/svg_polyline/0732.svg） | `0050edec05d60ece06f0c06261f69b48f4f3c05787fd88d8abb54af033e07b88` |
| 田 | `0979.svg` | https://zenodo.org/records/22467946 （data/svg_polyline/0979.svg） | `ef56b679ba00260068c61ae90607fcde3d689638d090274d9602f147a73a549a` |
| 人 | `0585.svg` | https://zenodo.org/records/22467946 （data/svg_polyline/0585.svg） | `7fac21d9c0b37a19fb8cb4e68e9ea886255488a969ad6ac47e7aa354e515e22f` |
| 大 | `0747.svg` | https://zenodo.org/records/22467946 （data/svg_polyline/0747.svg） | `ec31c0bc8542e089438f82223fa44ce606f58705c51087de931ea10aeb6d220a` |
| 鱼 | `1097.svg` | https://zenodo.org/records/22467946 （data/svg_polyline/1097.svg） | `33126052f0cdf500457bc9f0c19b7531e6cd9b0c63d76b871ccacdeb607a7d1b` |
| 口 | `0075.svg` | https://zenodo.org/records/22467946 （data/svg_polyline/0075.svg） | `948500d5ee85cbd8ffaa54da71432234e6b05717b60b4e63f94d26d130fac06a` |
| 禾 | `0536.svg` | https://zenodo.org/records/22467946 （data/svg_polyline/0536.svg） | `83fa33a94cb88d4e66adb572227665a0937c53c46dab18b43f959e1bc5821e81` |
| 女 | `0867.svg` | https://zenodo.org/records/22467946 （data/svg_polyline/0867.svg） | `c938202e8fdace759618108b1b2e04e556ccd0a48dce48750669ec4bd1953c9f` |

### 金文（`bronze`）

- **来源**：兄弟仓 `hanzi-glyphs-svg` 的 `glyphs/bronze/` 层
- **本仓的许可立场**：**CC0 1.0**（上游 `hanzi-glyphs-svg` 的 `provenance.jsonl` 记为 CC0 1.0，依据汉典《服务条款》第四条归公宣告）——公有领域奉献，不设义务；本子集按该口径随库发布。

#### 许可：CC0-1.0

- **上游数据集**：`汉典（zdic.net）金文字形`
- **协议全文**：<https://creativecommons.org/publicdomain/zero/1.0/>
- **上游取回时刻**：2026-10-23T00:05:37Z ～ 2026-10-23T00:05:37Z（逐文件记录见下表）

**上游给的署名语**（CC0 1.0 是公有领域奉献，**不设署名义务**；附在这里是为了可追溯）：

```
字形来自汉典（zdic.net）「书法」字形，依其《服务条款》第四条以 CC0 1.0 释出
```

**改动声明**

- *上游（兄弟仓 `hanzi-glyphs-svg`）入库时的改动*：removed 2 near-white 汉典 watermark element(s)；removed 1 near-white 汉典 watermark element(s)
- *本子集*：**没有作任何修改**——字形是上游文件的逐字节副本，本仓只做了「挑选 + 换目录 + 写索引」这一层，不触及字形内容。

**收录的字（20 个）**：明 天 日 持 想 好 如 河 語 本 水 手 未 末 月 山 木 目 田 人

| 现代字 | 文件 | 上游出处 | 上游 sha256 |
|---|---|---|---|
| 明 | `3155.svg` | https://img.zdic.net/zy/jinwen/32_F0AB.svg | `647c8b6b6483ae9fa1d4195350ef3f1c7d8ce6aa1d3df683f3faa78ab362fe6e` |
| 天 | `1762.svg` | https://img.zdic.net/zy/jinwen/31_E035.svg | `73b8ae7219aa0679892039fa0ab764fa44a335d4cb544df37b7057a3ef18689a` |
| 日 | `3126.svg` | https://img.zdic.net/zy/jinwen/32_EE81.svg | `763956057f0a12cd293ed347f4bc969fc71d930427e59de55905d5700ac93566` |
| 持 | `2927.svg` | https://img.zdic.net/zy/jinwen/33_EF63.svg | `9bf1d5960aceb48b7bd3cc1d9640c6cb12573db3115d8c9ebd2c32875eb404a0` |
| 想 | `2755.svg` | https://img.zdic.net/zy/jinwen/38_E5C7.svg | `f67258bf56ee4020ba9ceefc7486042b8596761ad5d49fd0ec9d48ce6d674e2c` |
| 好 | `1825.svg` | https://img.zdic.net/zy/jinwen/33_F208.svg | `8c2df4902413663453407fc039cc43d9e7a441a9c10723ee3dcc4cf3059e86c5` |
| 如 | `1836.svg` | https://img.zdic.net/zy/jinwen/33_F213.svg | `a3148369593b5c8686266149ae49428e2f5d649bb4eb453f4a3631e44c4e8d56` |
| 河 | `3664.svg` | https://img.zdic.net/zy/jinwen/33_EBEE.svg | `2a0c109b867de20c8497a3824c0f61812e385b0304e1c0ed0bf172340f0553e3` |
| 語 | `5247.svg` | https://img.zdic.net/zy/jinwen/31_EBA3.svg | `0f6460fb51cdf9c32d8c0ce2935e5ee46f281b52984781391eaaf87dbed4030f` |
| 本 | `3291.svg` | https://img.zdic.net/zy/jinwen/32_E96C.svg | `e153562a8fba9360332012777e40eb71abe7c0a1691c6f33c0c6c9fd032d9fc7` |
| 水 | `3610.svg` | https://img.zdic.net/zy/jinwen/33_EBE9.svg | `705fc36ab62c21774e26babbf35ea8d2bedd43321bdd2361cfffb331202592dc` |
| 手 | `2886.svg` | https://img.zdic.net/zy/jinwen/33_EF17.svg | `e890d43240691d7b949f153ee916eedfc60d4148e4573242a946ec8ed4e4b896` |
| 未 | `3283.svg` | https://img.zdic.net/zy/jinwen/34_EA2C.svg | `3b56dec5c4ef1fe76c6ca0f599d969eb3414fc347a39e8fd8aa6482b49ff26f9` |
| 末 | `3289.svg` | https://img.zdic.net/zy/jinwen/32_E982.svg | `3195f5004caccf371d922c2c6a1e658869e9b24d27e76c68427016b2ad80dc90` |
| 月 | `3243.svg` | https://img.zdic.net/zy/jinwen/32_EFE7.svg | `2062d8f5830fb1830fda99d6620d494fcb8384af24bc6a7cdd90d72e1075cf07` |
| 山 | `2311.svg` | https://img.zdic.net/zy/jinwen/33_E72F.svg | `81ad7dd10fd7b2b91ddcbcb544ff287ad1851bd5ae3933adbec0b17e7c9f6c60` |
| 木 | `3278.svg` | https://img.zdic.net/zy/jinwen/32_E92A.svg | `dba3e9cebc53436f55298686c9bafecea3d8e46a9ef085e5c72f19c6c17adc90` |
| 目 | `4265.svg` | https://img.zdic.net/zy/jinwen/31_F37B.svg | `237eee3fb14901c1a95a1a0f85617c9acac495a0173bef6f17a38786549b183f` |
| 田 | `4073.svg` | https://img.zdic.net/zy/jinwen/34_E0A7.svg | `ea1700360ce5f2aa7c09caccca17093febd441e132db02f271097eddff34a2d7` |
| 人 | `0553.svg` | https://img.zdic.net/zy/jinwen/32_F71B.svg | `eef45703e73d79f494b14eee00b482e22ba39d26023abc72f306a90443489038` |

### 篆书（`seal`）

- **来源**：兄弟仓 `hanzi-glyphs-svg` 的 `glyphs/seal/` 层
- **本仓的许可立场**：**CC0 1.0**（汉典《服务条款》第四条归公宣告）——公有领域奉献，不设义务，不署名也可以。

#### 许可：CC0-1.0

- **上游数据集**：`汉典（zdic.net）篆文字形`
- **协议全文**：<https://creativecommons.org/publicdomain/zero/1.0/>
- **上游取回时刻**：2026-10-22T17:15:13Z ～ 2026-10-22T17:15:13Z（逐文件记录见下表）

**上游给的署名语**（CC0 1.0 是公有领域奉献，**不设署名义务**；附在这里是为了可追溯）：

```
字形来自汉典（zdic.net）「书法」字形，依其《服务条款》第四条以 CC0 1.0 释出
```

**改动声明**

- *上游（兄弟仓 `hanzi-glyphs-svg`）入库时的改动*：removed 1 near-white 汉典 watermark element(s)；removed 2 near-white 汉典 watermark element(s)
- *本子集*：**没有作任何修改**——字形是上游文件的逐字节副本，本仓只做了「挑选 + 换目录 + 写索引」这一层，不触及字形内容。

**收录的字（20 个）**：投 明 天 日 指 持 控 想 好 如 河 眼 語 本 水 手 未 末 月 山

**附带的说文部首字形（7 个）**：朙 一 心 女 目 言 木

| 现代字 | 文件 | 上游出处 | 上游 sha256 |
|---|---|---|---|
| 投 | `3F37C.svg` | https://img.zdic.net/zy/xiaozhuan/27_6295.svg | `e5474be49733b9fc05523928b7f1f2d83d570262a8e41aa799a93436d22d24e5` |
| 明 | `3E38F.svg` | https://img.zdic.net/zy/xiaozhuan/27_F062.svg | `36c0f6271b97b7cd50f8e7ef50b78b80422fff4f6dbc5cb1b4052b0bddb54431` |
| 天 | `3D003.svg` | https://img.zdic.net/zy/xiaozhuan/27_5929.svg | `218514c5e17a93dc35650ba5dbadb43ef751725309ab02bffa0f3e6ab5b9a9d3` |
| 日 | `3E2F3.svg` | https://img.zdic.net/zy/xiaozhuan/27_65E5.svg | `f0f925cd63e86edc9dc37a9e504db500e7af1053dd9e03fb388a150f0cb3c386` |
| 指 | `3F310.svg` | https://img.zdic.net/zy/xiaozhuan/27_6307.svg | `35ac9a2a7abedea6a6bb3d19b71ac568db02cd7789647820c58786856b449045` |
| 持 | `3F32E.svg` | https://img.zdic.net/zy/xiaozhuan/27_6301.svg | `029e24a36042695055c32bc0f7282ea1daff591e5241611cf94bebceff6ed3cd` |
| 控 | `3F350.svg` | https://img.zdic.net/zy/xiaozhuan/27_63A7.svg | `b76af665a2bca087164e6eb5fc64f3e2c5bc699f9f2ff7f09cf8bb81e67abdbf` |
| 想 | `3EE6C.svg` | https://img.zdic.net/zy/xiaozhuan/27_60F3.svg | `5ed669b688ff7ed4d64f1419f03f56e00fe40ddaa2e1d3dc0923acc3252a5acc` |
| 好 | `3F49B.svg` | https://img.zdic.net/zy/xiaozhuan/27_597D.svg | `ec7f3d07bab1008e3248fd73c325956904fbc8242550c7d4a9602f2fbbd61835` |
| 如 | `3F4D2.svg` | https://img.zdic.net/zy/xiaozhuan/27_5982.svg | `edd24e41337aa8957dda427a33a1891bb73be2f6f33f9718737c07a97eb4b428` |
| 河 | `3EF60.svg` | https://img.zdic.net/zy/xiaozhuan/27_6CB3.svg | `96182157db3f204a4aff22729bb6f84e8c777bf32aa1f69b3a10731bcc93ca65` |
| 眼 | `3D982.svg` | https://img.zdic.net/zy/xiaozhuan/27_773C.svg | `be2d05a02388b0f2bfc97089abb1834116e0140e7889f433937a1995fd84ba14` |
| 語 | `3D68C.svg` | https://img.zdic.net/zy/xiaozhuan/27_8A9E.svg | `a24bd5df855b4bc0bbea75c61955c6906a287a8d1fd27a08f79066310d064f01` |
| 本 | `3E04A.svg` | https://img.zdic.net/zy/xiaozhuan/27_672C.svg | `9cfafc43947278e71eca027db3f830976a2f40519a7847f2fb444fa6711d1346` |
| 水 | `3EF5E.svg` | https://img.zdic.net/zy/xiaozhuan/27_6C34.svg | `e546ed6f3be64c5695d3d84ce78cc7a63b902c90e9bac39b058098a03f3599c4` |
| 手 | `3F30C.svg` | https://img.zdic.net/zy/xiaozhuan/27_624B.svg | `b3bf918673a6cba8102ee2258dba3379933e2ea30d751172ca753e91bbcad338` |
| 未 | `3FBDE.svg` | https://img.zdic.net/zy/xiaozhuan/27_672A.svg | `b8e35b02bbba0e648141396b391aed46329c8b37931a6904b5bda0d4e01547e4` |
| 末 | `3E050.svg` | https://img.zdic.net/zy/xiaozhuan/27_672B.svg | `acc8c4768d6b1b8c65378c02436bb818b94f5001a0083f49cd8a9b6ebdcfd884` |
| 月 | `3E37E.svg` | https://img.zdic.net/zy/xiaozhuan/27_6708.svg | `730f1f9c3b7d8f753b6c5088a6ef8cde44799366b9d7dba8c4610a1eeb76fb5e` |
| 山 | `3EA5A.svg` | https://img.zdic.net/zy/xiaozhuan/27_5C71.svg | `e40816b794c44b020d70e021df40536cdf1aca7b6e5c37715faa13d11175c983` |
| 朙 | `3E38E.svg` | https://img.zdic.net/zy/xiaozhuan/27_F062.svg | `36c0f6271b97b7cd50f8e7ef50b78b80422fff4f6dbc5cb1b4052b0bddb54431` |
| 一 | `3D000.svg` | https://img.zdic.net/zy/xiaozhuan/27_4E00.svg | `95e2f6b10e480a2f6d406ba236f62058bb1a6649e72575383ae248e2cd123ef2` |
| 心 | `3EE2A.svg` | https://img.zdic.net/zy/xiaozhuan/27_5FC3.svg | `37b8d4a08d9cd226a30dc71e88e563d57ad1654948a55ac976c0f2c0323fe204` |
| 女 | `3F442.svg` | https://img.zdic.net/zy/xiaozhuan/27_5973.svg | `6419184f7e86553e94899e76b9a06d6520b23f68ab5947a2a6c8f494fbac0394` |
| 目 | `3D97F.svg` | https://img.zdic.net/zy/xiaozhuan/27_76EE.svg | `a2b100c4a95a95ebe39527a290e2ee88a9d78f7670783ad5fe163a0d8d5a712f` |
| 言 | `3D689.svg` | https://img.zdic.net/zy/xiaozhuan/27_8A00.svg | `1b666a9e69d8b278d20985a03377b0c35cb5515d0a9acc2c0522874141e3ac72` |
| 木 | `3DFA9.svg` | https://img.zdic.net/zy/xiaozhuan/27_6728.svg | `ced37974def3ee3ac8c9ed185ff7d2dc00f260dadd7f30024329d99a181ff3af` |

### 隶书（`clerical`）

- **来源**：兄弟仓 `hanzi-glyphs-svg` 的 `glyphs/clerical/` 层
- **本仓的许可立场**：**CC0 1.0**（上游 `hanzi-glyphs-svg` 的 `provenance.jsonl` 记为 CC0 1.0，依据汉典《服务条款》第四条归公宣告）——公有领域奉献，不设义务；本子集按该口径随库发布。

#### 许可：CC0-1.0

- **上游数据集**：`汉典（zdic.net）隶文字形`
- **协议全文**：<https://creativecommons.org/publicdomain/zero/1.0/>
- **上游取回时刻**：2026-10-23T02:01:42Z ～ 2026-10-23T02:01:42Z（逐文件记录见下表）

**上游给的署名语**（CC0 1.0 是公有领域奉献，**不设署名义务**；附在这里是为了可追溯）：

```
字形来自汉典（zdic.net）「书法」字形，依其《服务条款》第四条以 CC0 1.0 释出
```

**改动声明**

- *上游（兄弟仓 `hanzi-glyphs-svg`）入库时的改动*：none (byte-identical copy)
- *本子集*：**没有作任何修改**——字形是上游文件的逐字节副本，本仓只做了「挑选 + 换目录 + 写索引」这一层，不触及字形内容。

**收录的字（20 个）**：投 明 天 日 指 持 控 想 好 如 河 語 本 水 手 未 末 月 山 木

| 现代字 | 文件 | 上游出处 | 上游 sha256 |
|---|---|---|---|
| 投 | `3293.svg` | https://img.zdic.net/zy/lishu/71_EC61.svg | `4e01b5e7aff44e26d18a55f221a322542d55a22914419fd8854788bb32442ffc` |
| 明 | `3703.svg` | https://img.zdic.net/zy/lishu/92_EEE8.svg | `1bd8b81d702a50f58682041474d5d0d62a56c3fa20d63f6f81db3fe73613a5a9` |
| 天 | `1929.svg` | https://img.zdic.net/zy/lishu/91_E01C.svg | `36893b106fac2f5407c66039ef931106a4c6b8159764e2febdd8280920ade29b` |
| 日 | `3667.svg` | https://img.zdic.net/zy/lishu/92_ED1E.svg | `3463bdac094c4fb1d1a75c2216dd8c018c5106d7797a4cb7ae86790488c896c1` |
| 指 | `3336.svg` | https://img.zdic.net/zy/lishu/71_EC48.svg | `9350929fd88f32e170b79861b22126e83ed8e3dad469de30d30432fdab957d71` |
| 持 | `3334.svg` | https://img.zdic.net/zy/lishu/93_F56C.svg | `c86a3620d81ed4934dbb8b098078925663e9244ba325f2deac4f27ec55bdbb35` |
| 控 | `3402.svg` | https://img.zdic.net/zy/lishu/94_EEBF.svg | `d2b358ccec355188fd0bf1bfb684fdb7169b661bb08f8221646e308ce33bcbb5` |
| 想 | `3075.svg` | https://img.zdic.net/zy/lishu/93_ED24.svg | `9151586c15a2be6f8eb127971e14d5de7a0090bdfefa82acb8e158e5791f070a` |
| 好 | `2012.svg` | https://img.zdic.net/zy/lishu/71_EC9F.svg | `f0a2b0a066f089dd869e53515c42bbfe36dd7ec24eb9f32494178f411e04c34b` |
| 如 | `2017.svg` | https://img.zdic.net/zy/lishu/71_ECA3.svg | `ae6261ef4a364c62cb92387a2169009b62d1102f8984c8e1ac44f9f970ee437c` |
| 河 | `4630.svg` | https://img.zdic.net/zy/lishu/71_EB9F.svg | `f2a82dfa940878bfb2d9c2b60052e6be77f947d5d37230a581d5745039c7107c` |
| 語 | `7689.svg` | https://img.zdic.net/zy/lishu/71_E20A.svg | `1cf8137b5d0cc5250983bd32e8808cba247278589c9ea5feb27c873a8226d426` |
| 本 | `3885.svg` | https://img.zdic.net/zy/lishu/92_E75B.svg | `e37c29e53b23754671987e7450000979351b4062d5a72cfaf2339fb88953972b` |
| 水 | `4540.svg` | https://img.zdic.net/zy/lishu/71_EB9D.svg | `36e278f876d60b2cc20658e4aab349bbf1ca6be8d0bd5cd3f0c43574edf18901` |
| 手 | `3270.svg` | https://img.zdic.net/zy/lishu/71_EC47.svg | `22e6ad412177d686ce13f99c136b7a63d973f70f1a3d04af66ae9a0d6ee9145f` |
| 未 | `3879.svg` | https://img.zdic.net/zy/lishu/71_EF15.svg | `4c26c86a07d6aa740059f91991844e4ff8848e834c30e6035e4dad114127129a` |
| 末 | `3882.svg` | https://img.zdic.net/zy/lishu/71_E5E6.svg | `a9eeb8c2b7a99a422a2fe858e5de5f859b0a08759703a96c000e6cd1692be356` |
| 月 | `3844.svg` | https://img.zdic.net/zy/lishu/71_E729.svg | `5bf783659ad25aa9f59dcc7f61bfdc5c336ba9dab2184432f40a46033e577452` |
| 山 | `2472.svg` | https://img.zdic.net/zy/lishu/71_EA35.svg | `355fb0e8440278963f650ea4d29528e04a5e207646468a4712d9b1abca1f5e54` |
| 木 | `3875.svg` | https://img.zdic.net/zy/lishu/71_E5C0.svg | `34f2f1cdd6b4e3625671edcd62271e761b4b24e63faca6a49afb4f935db588e9` |

## 三、配套数据（非字形）

### 3.1 `data/index/<层>.json` —— 现代字 → 文件名

由 `tools/build_index.ts` 的同一规则产出（**首个实例优先**），只是过滤到子集里的那些字。演示页用它把「现代字」翻成「要取哪个文件」。

### 3.2 `data/radical-forms.json` —— 部首的偏旁形码本

**派生数据**：由 `tools/build_radical_forms.ts` 从字形归纳出来（笔画形状描述子 + 覆盖度挑代表），不是上游素材。

- **性质与字形相同**——它是从字形算出来的，许可随所用书体层走；
- **用途**：给部首定位的**投票法**提供候选偏旁形（实测投票法比模板法准，但只在归纳出了偏旁形的部上可用）。取不到时演示页退回模板法，照常能跑。

### 3.3 `data/seal-radicals.json` —— 说文 540 部登记

格式：`{ 篆书码位: [说文部次, 部首码位, 部首字] }`，与 `assets/index/seal-radicals.json` 一致。

由兄弟仓 `hanzi-glyphs-svg` 的 `glyphs/seal/external.csv` 整理而成（上游指针来自 Unicode `SealSources.txt`）。**本子集只登记码位与部首身份，不复制上游字形**，所以它不构成对上游内容的分发；按本仓惯例，随附 Unicode License v3 的声明（见本仓 `THIRD_PARTY_NOTICES.md`）。

### 3.4 `data/stroke-order/` —— 楷书笔顺

- **来源**：[hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) （版本 2.0.1）
- **许可**：**Arphic Public License**（许可全文随附于本目录的 `ARPHICPL.TXT`）
- **上游取回时刻**：2026-10-25T03:37:37.260Z

**发布时必须随附**：Arphic Public License 的许可全文（本目录已带 `ARPHICPL.TXT`）与出处声明。

收录的字（33 个）：一 人 口 大 天 女 好 如 山 心 想 手 投 持 指 控 日 明 月 木 未 末 本 水 河 火 田 目 眼 禾 言 語 鱼

这里的「楷书笔顺」与本仓甲骨/篆/隶的「落笔顺序」**不是同一套笔顺体系**，界面与文档里都要说清楚，不能混为一谈。

## 四、发布这份子集时必须做的五件事

1. **甲骨文层按 CC BY 4.0 署名**：把上面「发布时必须署名的文字」整段照抄，并注明本子集作过的改动（挑选 + 逐字节复制）。
2. **金文 / 隶书按 CC0 1.0 随库发布**——上游 `provenance.jsonl` 记的是 CC0 1.0，本子集按该口径发布，不设义务；署名不强制，但署上来源更体面。
3. **傳抄古文 / 楚简两层不随本子集发布**——上游还没公开这两层，本子集也不收；等上游发布（作者会另建公共仓）后，在 `tools/build_demo_glyphs.ts` 的 `DEMO_LAYERS` 里加回来重跑。
4. **笔顺数据随附 Arphic Public License 全文**（`data/stroke-order/ARPHICPL.TXT` 已在目录里）。
5. **不要给下游附加额外限制**：CC BY 4.0 §2(a)(5)(B) 与 CC0 的「放弃权利」性质都不允许附加条件（如「仅限非商业」「禁止再分发」）。

本子集里的字形**逐字节等于上游**（sha256 见各层表格），与兄弟仓 `provenance.jsonl` 一一对应；完整出处记录见兄弟仓的 `glyphs/provenance.jsonl`。
