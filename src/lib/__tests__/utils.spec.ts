import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn utility", () => {
  describe("basic functionality", () => {
    it("merges multiple class names", () => {
      const result = cn("class1", "class2", "class3");
      expect(result).toBe("class1 class2 class3");
    });

    it("handles single class name", () => {
      const result = cn("single-class");
      expect(result).toBe("single-class");
    });

    it("handles empty input", () => {
      const result = cn();
      expect(result).toBe("");
    });

    it("filters out falsy values", () => {
      const result = cn("class1", false, "class2", null, "class3", undefined);
      expect(result).toBe("class1 class2 class3");
    });

    it("handles conditional classes", () => {
      const isActive = true;
      const isDisabled = false;

      const result = cn("base", isActive && "active", isDisabled && "disabled");
      expect(result).toBe("base active");
    });
  });

  describe("Tailwind CSS class merging", () => {
    it("merges conflicting Tailwind classes correctly", () => {
      const result = cn("px-2 py-1", "px-4");
      expect(result).toBe("py-1 px-4");
    });

    it("handles responsive variants", () => {
      const result = cn("text-sm md:text-base", "md:text-lg");
      expect(result).toBe("text-sm md:text-lg");
    });

    it("handles state variants", () => {
      const result = cn("hover:bg-blue-500", "hover:bg-red-500");
      expect(result).toBe("hover:bg-red-500");
    });

    it("preserves non-conflicting classes", () => {
      const result = cn("text-blue-500 font-bold", "text-red-500");
      expect(result).toBe("font-bold text-red-500");
    });

    it("handles dark mode variants", () => {
      const result = cn("bg-white dark:bg-black", "dark:bg-gray-900");
      expect(result).toBe("bg-white dark:bg-gray-900");
    });

    it("merges spacing utilities correctly", () => {
      const result = cn("m-2 p-4", "m-4");
      expect(result).toBe("p-4 m-4");
    });

    it("handles arbitrary values", () => {
      const result = cn("w-[100px]", "w-[200px]");
      expect(result).toBe("w-[200px]");
    });
  });

  describe("clsx functionality", () => {
    it("handles object syntax", () => {
      const result = cn({
        class1: true,
        class2: false,
        class3: true,
      });
      expect(result).toBe("class1 class3");
    });

    it("handles array syntax", () => {
      const result = cn(["class1", "class2"], "class3");
      expect(result).toBe("class1 class2 class3");
    });

    it("handles nested arrays", () => {
      const result = cn(["class1", ["class2", "class3"]], "class4");
      expect(result).toBe("class1 class2 class3 class4");
    });

    it("handles mixed syntax", () => {
      const result = cn("class1", ["class2", { class3: true, class4: false }], "class5");
      expect(result).toBe("class1 class2 class3 class5");
    });
  });

  describe("real-world component scenarios", () => {
    it("merges button variant classes", () => {
      const baseClasses = "px-4 py-2 rounded font-medium";
      const variantClasses = "bg-blue-500 text-white hover:bg-blue-600";
      const customClasses = "bg-red-500 hover:bg-red-600";

      const result = cn(baseClasses, variantClasses, customClasses);

      expect(result).toContain("px-4");
      expect(result).toContain("py-2");
      expect(result).toContain("rounded");
      expect(result).toContain("font-medium");
      expect(result).toContain("text-white");
      expect(result).toContain("bg-red-500"); // Override
      expect(result).toContain("hover:bg-red-600"); // Override
      expect(result).not.toContain("bg-blue-500");
      expect(result).not.toContain("hover:bg-blue-600");
    });

    it("handles card component classes", () => {
      const base = "rounded-lg border bg-white p-6";
      const variant = "shadow-md";
      const state = "hover:shadow-lg";

      const result = cn(base, variant, state);

      expect(result).toBe("rounded-lg border bg-white p-6 shadow-md hover:shadow-lg");
    });

    it("merges input component classes with states", () => {
      const base = "border rounded px-3 py-2";
      const error = false;
      const disabled = true;

      const result = cn(base, error && "border-red-500", disabled && "opacity-50 cursor-not-allowed");

      expect(result).toContain("border");
      expect(result).toContain("rounded");
      expect(result).toContain("opacity-50");
      expect(result).toContain("cursor-not-allowed");
      expect(result).not.toContain("border-red-500");
    });

    it("handles dialog overlay classes", () => {
      const result = cn(
        "fixed inset-0 z-50",
        "bg-black/80",
        "data-[state=open]:animate-in",
        "data-[state=closed]:animate-out"
      );

      expect(result).toContain("fixed");
      expect(result).toContain("inset-0");
      expect(result).toContain("z-50");
      expect(result).toContain("bg-black/80");
    });
  });

  describe("edge cases", () => {
    it("handles whitespace in class names", () => {
      const result = cn("  class1  ", "  class2  ");
      expect(result).toBe("class1 class2");
    });

    it("handles empty strings", () => {
      const result = cn("class1", "", "class2", "");
      expect(result).toBe("class1 class2");
    });

    it("handles duplicate classes", () => {
      const result = cn("class1", "class1", "class2");
      // clsx does not deduplicate non-conflicting classes
      expect(result).toBe("class1 class1 class2");
    });

    it("handles very long class strings", () => {
      const longClasses = Array(100).fill("class").join(" ");
      const result = cn(longClasses, "additional");

      expect(result).toContain("class");
      expect(result).toContain("additional");
    });

    it("handles special characters in class names", () => {
      const result = cn("class-1", "class_2", "class:3", "class[4]");
      expect(result).toContain("class-1");
      expect(result).toContain("class_2");
      expect(result).toContain("class:3");
      expect(result).toContain("class[4]");
    });

    it("handles numeric class names", () => {
      const result = cn("w-1/2", "w-2/3");
      expect(result).toBe("w-2/3");
    });
  });

  describe("performance considerations", () => {
    it("handles large number of arguments efficiently", () => {
      const classes = Array(1000)
        .fill("class")
        .map((c, i) => `${c}-${i}`);
      const startTime = performance.now();
      const result = cn(...classes);
      const endTime = performance.now();

      expect(result).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    it("handles deeply nested structures", () => {
      const nested = ["class1", ["class2", ["class3", ["class4", ["class5"]]]]];

      const result = cn(nested);
      expect(result).toContain("class1");
      expect(result).toContain("class5");
    });
  });

  describe("type safety", () => {
    it("accepts string arguments", () => {
      const result = cn("class1", "class2");
      expect(typeof result).toBe("string");
    });

    it("accepts boolean arguments", () => {
      const result = cn(true && "class1", false && "class2");
      expect(result).toBe("class1");
    });

    it("accepts undefined arguments", () => {
      const maybeClass: string | undefined = undefined;
      const result = cn("class1", maybeClass, "class2");
      expect(result).toBe("class1 class2");
    });

    it("accepts null arguments", () => {
      const maybeClass: string | null = null;
      const result = cn("class1", maybeClass, "class2");
      expect(result).toBe("class1 class2");
    });
  });
});
