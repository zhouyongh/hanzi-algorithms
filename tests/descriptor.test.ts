/**
 * 形状描述子的测试。
 *
 * 描述子的用途是判断「两个字里的某一笔是不是同一种笔画」，所以最要紧的两条
 * 性质是：**与位置无关**（按自身外接框归一化）与**可比较**（距离能反映差异）。
 *
 * 距离这条原先有两个坑，已经修掉，用例改成正常断言：
 *
 * 1. 位图长度不同的时候距离算成 0（只比公共前缀）；
 * 2. 畸形描述子（缺分隔符）直接抛 TypeError。
 *
 * 这两条都要紧——`radical.ts` 拿这个距离当投票阈值，
 * 「距离 0」必须只意味着「同一个形状」。
 */

import { describe, expect, it } from "vitest";
import { createMask, type Mask } from "../src/raster/mask.ts";
import {
  DESC_SIZE,
  clusterDescriptors,
  describeMask,
  descriptorDistance,
  minDescriptorDistance,
} from "../src/structure/descriptor.ts";

/** 造一张掩膜：ink 决定哪些像素有墨。 */
function maskOf(width: number, height: number, ink: (x: number, y: number) => boolean): Mask {
  const mask = createMask(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (ink(x, y)) mask.data[y * width + x] = 1;
    }
  }
  return mask;
}

/** 实心方块。 */
function solid(width: number, height: number): Mask {
  return maskOf(width, height, () => true);
}

/** 描述子的位图部分。 */
function bitsOf(descriptor: string): string {
  return descriptor.split("|")[1] ?? "";
}

/** 描述子的长宽比桶。 */
function aspectOf(descriptor: string): string {
  return descriptor.split("|")[0] ?? "";
}

describe("形状描述子：describeMask", () => {
  it("空白掩膜 → empty", () => {
    expect(describeMask(createMask(10, 10))).toBe("empty");
  });

  it("零尺寸掩膜 → empty，不抛异常", () => {
    expect(describeMask(createMask(0, 0))).toBe("empty");
    expect(describeMask(createMask(10, 0))).toBe("empty");
    expect(describeMask(createMask(0, 10))).toBe("empty");
  });

  it("实心方块 → 长宽比 1.00，位图是 DESC_SIZE² 位", () => {
    const d = describeMask(solid(20, 20));
    expect(aspectOf(d)).toBe("1.00");
    expect(bitsOf(d).length).toBe(DESC_SIZE * DESC_SIZE);
    expect(bitsOf(d).split("").filter((b) => b === "1").length).toBe(DESC_SIZE * DESC_SIZE);
  });

  it("位图只由 0/1 组成", () => {
    const d = describeMask(maskOf(20, 20, (x, y) => x < 10));
    expect(/^[01]+$/.test(bitsOf(d))).toBe(true);
  });

  it("不变量：与位置无关——同一个形状挪个位置，描述子不变", () => {
    // 描述子按自身外接框归一化，所以位置不该进描述子。
    const a = describeMask(maskOf(30, 30, (x, y) => x < 20 && y < 20));
    const b = describeMask(maskOf(30, 30, (x, y) => x >= 5 && y >= 5 && x < 25 && y < 25));
    expect(a).toBe(b);
  });

  it("不变量：确定性——同一张掩膜算两遍结果一致", () => {
    const mask = solid(17, 23);
    expect(describeMask(mask)).toBe(describeMask(mask));
  });

  it("边界：单像素有墨 → 不抛异常", () => {
    const d = describeMask(maskOf(10, 10, (x, y) => x === 3 && y === 4));
    expect(aspectOf(d)).toBe("1.00");
    expect(bitsOf(d).length).toBe(DESC_SIZE * DESC_SIZE);
  });

  it("已知缺陷：轴对齐的细笔画，位图退化成全 1——形状信息全丢", () => {
    // 掩膜按自身外接框裁出来后是 40×1，缩到 12×12 时每一行都映射回唯一那一行，
    // 于是整块被填满；竖线（1×40）同理。横竖两笔的位图完全一样，
    // 只靠长宽比桶区分。
    const horizontal = describeMask(maskOf(40, 1, () => true));
    const vertical = describeMask(maskOf(1, 40, () => true));
    expect(bitsOf(horizontal)).toBe("1".repeat(DESC_SIZE * DESC_SIZE));
    expect(bitsOf(vertical)).toBe(bitsOf(horizontal));
    expect(aspectOf(horizontal)).toBe("40.00");
    expect(aspectOf(vertical)).toBe("0.00");
  });

  it("已知缺陷：长宽比被量化到 1/3，近似比例区分不出来", () => {
    const a = describeMask(maskOf(30, 20, () => true)); // 1.50
    const b = describeMask(maskOf(31, 20, () => true)); // 1.55
    expect(aspectOf(a)).toBe(aspectOf(b));
  });
});

describe("形状描述子：descriptorDistance", () => {
  it("同一个描述子 → 距离 0", () => {
    const d = describeMask(solid(20, 20));
    expect(descriptorDistance(d, d)).toBe(0);
  });

  it("形状明显不同 → 距离为正", () => {
    const square = describeMask(solid(20, 20));
    const line = describeMask(maskOf(40, 1, () => true));
    expect(descriptorDistance(square, line)).toBeGreaterThan(0);
  });

  it("与 empty 的距离是 Infinity", () => {
    const d = describeMask(solid(20, 20));
    expect(descriptorDistance(d, "empty")).toBe(Infinity);
    expect(descriptorDistance("empty", d)).toBe(Infinity);
    expect(descriptorDistance("empty", "empty")).toBe(0);
  });

  it("缺陷 P3（已修）：位图长度不同的两个描述子，距离不再算成 0", () => {
    // 原来是缺陷 P3：距离只比较公共前缀，多出来的位完全不计入——
    // 于是「距离 0」不等于「同一个形状」，而 radical.ts 拿这个距离当投票阈值，
    // 不同的部首形会被判成同一个。
    const short = "1.00|0101";
    const long = `1.00|0101${"0".repeat(140)}`;
    expect(short).not.toBe(long);
    expect(descriptorDistance(short, long)).toBeGreaterThan(0);
    // 短的那一侧缺的 140 位全部计入差异
    expect(descriptorDistance(short, long)).toBe(140);
  });

  it("缺陷 P3（已修）：畸形描述子不抛异常，返回一个大距离", () => {
    // 原来是缺陷 P3：`split("|")` 之后位图部分是 undefined，`ab.length` 直接炸。
    expect(() => descriptorDistance("1.00", "1.00|0")).not.toThrow();
    // 畸形 = 完全不像：距离取 Infinity，radical.ts 的投票会直接把它排除
    expect(descriptorDistance("1.00", "1.00|0")).toBe(Infinity);
    expect(descriptorDistance("1.00|0", "1.00")).toBe(Infinity);
  });

  it("缺陷 P3（已修）：两个字符串不同 ⇒ 距离 > 0", () => {
    // 这是判据的底线：radical.ts 拿这个距离当投票阈值，
    // 「距离 0」必须只意味着「同一个形状」。
    const cases: Array<[string, string]> = [
      ["1.00|0101", "1.00|0100"],
      ["1.00|0101", `1.00|0101${"0".repeat(140)}`],
      ["1.00|0101", "1.33|0101"],
      ["1.0|0101", "1.00|0101"], // 同值不同写法也算不同
      ["1.00|0101", "1.00|0101|0101"],
      ["1.00|0101", "not-a-descriptor"],
    ];
    for (const [a, b] of cases) {
      expect(a).not.toBe(b);
      expect(descriptorDistance(a, b), `${a} vs ${b}`).toBeGreaterThan(0);
    }
  });

  it("畸形输入的几种形态都不抛异常，也不产生 NaN", () => {
    const bad = ["1.00", "", "1.00|", "|0101", "abc|0101", "1.00|01x1", "1.00|0101|0101"];
    for (const d of bad) {
      expect(() => descriptorDistance(d, "1.00|0101"), d).not.toThrow();
      expect(() => descriptorDistance("1.00|0101", d), d).not.toThrow();
      expect(Number.isNaN(descriptorDistance(d, "1.00|0101")), d).toBe(false);
      expect(Number.isNaN(descriptorDistance("1.00|0101", d)), d).toBe(false);
    }
  });
});

describe("形状描述子：clusterDescriptors", () => {
  it("相同的描述子聚成一簇", () => {
    const a = describeMask(solid(20, 20));
    const b = describeMask(maskOf(30, 30, (x, y) => x >= 5 && y >= 5 && x < 25 && y < 25));
    expect(a).toBe(b);
    expect(clusterDescriptors([a, b], 0).length).toBe(1);
  });

  it("明显不同的形状分成两簇", () => {
    const square = describeMask(solid(20, 20));
    const line = describeMask(maskOf(40, 1, () => true));
    expect(clusterDescriptors([square, line], 0).length).toBe(2);
  });

  it("阈值放宽 → 全部并成一簇", () => {
    const square = describeMask(solid(20, 20));
    const line = describeMask(maskOf(40, 1, () => true));
    expect(clusterDescriptors([square, line], 1000).length).toBe(1);
  });

  it("empty 不参与聚类，也不会出现在结果里", () => {
    const square = describeMask(solid(20, 20));
    const centers = clusterDescriptors(["empty", square, "empty"], 0);
    expect(centers.length).toBe(1);
    expect(centers).not.toContain("empty");
    expect(clusterDescriptors(["empty"], 0)).toEqual([]);
  });

  it("空输入 → 空结果", () => {
    expect(clusterDescriptors([], 10)).toEqual([]);
  });

  it("不变量：簇数不超过输入个数，且结果里没有 empty", () => {
    const inputs = [
      describeMask(solid(20, 20)),
      describeMask(maskOf(40, 1, () => true)),
      describeMask(maskOf(1, 40, () => true)),
      "empty",
    ];
    const centers = clusterDescriptors(inputs, 30);
    expect(centers.length).toBeLessThanOrEqual(inputs.length);
    expect(centers.every((c) => c !== "empty")).toBe(true);
  });

  it("缺陷 P3（已修）：畸形描述子不进簇", () => {
    // 畸形描述子代表不了任何形状，不该混进簇中心里
    const square = describeMask(solid(20, 20));
    const centers = clusterDescriptors([square, "1.00", "abc|0101", ""], 0);
    expect(centers).toEqual([square]);
  });

  it("缺陷 P3（已修）：并簇后位图不被截短", () => {
    // 旧实现只比公共前缀，合并出来的簇中心会丢掉多出来的那一段位
    const centers = clusterDescriptors(["1.00|0101", `1.00|0101${"0".repeat(140)}`], 200);
    expect(centers.length).toBe(1);
    expect(bitsOf(centers[0]).length).toBe(144);
  });
});

describe("形状描述子：minDescriptorDistance", () => {
  it("取参考集里的最小距离", () => {
    const square = describeMask(solid(20, 20));
    const line = describeMask(maskOf(40, 1, () => true));
    expect(minDescriptorDistance(square, [line, square])).toBe(0);
    expect(minDescriptorDistance(line, [square])).toBe(
      descriptorDistance(line, square),
    );
  });

  it("参考集为空 → Infinity", () => {
    expect(minDescriptorDistance(describeMask(solid(20, 20)), [])).toBe(Infinity);
  });

  it("参考集全是 empty → Infinity", () => {
    expect(minDescriptorDistance(describeMask(solid(20, 20)), ["empty"])).toBe(Infinity);
  });
});
