import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Button, buttonVariants } from "@/app/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Select } from "@/app/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";

// Mock the utils
vi.mock("@/app/components/ui/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

// Mock cva
vi.mock("class-variance-authority", () => ({
  cva: (base: string, config: unknown) => {
    const fn = ({ variant, size, className }: Record<string, string>) => {
      return [base, variant, size, className].filter(Boolean).join(" ");
    };
    fn.variants = config;
    return fn;
  },
}));

// Mock @radix-ui/react-slot
vi.mock("@radix-ui/react-slot", () => ({
  Slot: ({ children, ...props }: Record<string, unknown>) => (
    <span {...props}>{children as React.ReactNode}</span>
  ),
}));

describe("Button", () => {
  it("should render button with children", () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText("Click Me")).toBeInTheDocument();
  });

  it("should pass through button props", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    fireEvent.click(screen.getByText("Click Me"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should render disabled button", () => {
    render(<Button disabled>Click Me</Button>);
    expect(screen.getByText("Click Me")).toBeDisabled();
  });

  it("should render as child component when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>,
    );
    expect(screen.getByText("Link Button")).toBeInTheDocument();
  });

  it("should have correct data-slot attribute", () => {
    const { container } = render(<Button>Click Me</Button>);
    expect(container.firstChild).toHaveAttribute("data-slot", "button");
  });
});

describe("buttonVariants", () => {
  it("should exist as an export", () => {
    expect(buttonVariants).toBeDefined();
  });
});

describe("Card components", () => {
  describe("Card", () => {
    it("should render card with children", () => {
      render(<Card>Card Content</Card>);
      expect(screen.getByText("Card Content")).toBeInTheDocument();
    });

    it("should have correct data-slot attribute", () => {
      const { container } = render(<Card>Card Content</Card>);
      expect(container.firstChild).toHaveAttribute("data-slot", "card");
    });

    it("should pass through className", () => {
      const { container } = render(<Card className="custom-class">Content</Card>);
      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("CardHeader", () => {
    it("should render card header with children", () => {
      render(<CardHeader>Header Content</CardHeader>);
      expect(screen.getByText("Header Content")).toBeInTheDocument();
    });

    it("should have correct data-slot attribute", () => {
      const { container } = render(<CardHeader>Header Content</CardHeader>);
      expect(container.firstChild).toHaveAttribute("data-slot", "card-header");
    });
  });

  describe("CardTitle", () => {
    it("should render card title with children", () => {
      render(<CardTitle>Title Text</CardTitle>);
      expect(screen.getByText("Title Text")).toBeInTheDocument();
    });

    it("should have correct data-slot attribute", () => {
      const { container } = render(<CardTitle>Title Text</CardTitle>);
      expect(container.firstChild).toHaveAttribute("data-slot", "card-title");
    });

    it("should render as h3 element", () => {
      const { container } = render(<CardTitle>Title Text</CardTitle>);
      expect(container.firstChild?.nodeName).toBe("H3");
    });
  });

  describe("CardDescription", () => {
    it("should render card description with children", () => {
      render(<CardDescription>Description Text</CardDescription>);
      expect(screen.getByText("Description Text")).toBeInTheDocument();
    });

    it("should have correct data-slot attribute", () => {
      const { container } = render(<CardDescription>Description Text</CardDescription>);
      expect(container.firstChild).toHaveAttribute("data-slot", "card-description");
    });
  });

  describe("CardContent", () => {
    it("should render card content with children", () => {
      render(<CardContent>Content Area</CardContent>);
      expect(screen.getByText("Content Area")).toBeInTheDocument();
    });

    it("should have correct data-slot attribute", () => {
      const { container } = render(<CardContent>Content Area</CardContent>);
      expect(container.firstChild).toHaveAttribute("data-slot", "card-content");
    });
  });

  describe("CardFooter", () => {
    it("should render card footer with children", () => {
      render(<CardFooter>Footer Content</CardFooter>);
      expect(screen.getByText("Footer Content")).toBeInTheDocument();
    });

    it("should have correct data-slot attribute", () => {
      const { container } = render(<CardFooter>Footer Content</CardFooter>);
      expect(container.firstChild).toHaveAttribute("data-slot", "card-footer");
    });
  });

  describe("Full Card composition", () => {
    it("should render a complete card with all sections", () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Card</CardTitle>
            <CardDescription>This is a test card</CardDescription>
          </CardHeader>
          <CardContent>Main content goes here</CardContent>
          <CardFooter>Footer actions</CardFooter>
        </Card>,
      );

      expect(screen.getByText("Test Card")).toBeInTheDocument();
      expect(screen.getByText("This is a test card")).toBeInTheDocument();
      expect(screen.getByText("Main content goes here")).toBeInTheDocument();
      expect(screen.getByText("Footer actions")).toBeInTheDocument();
    });
  });
});

describe("Input", () => {
  it("should render input element", () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
  });

  it("should have correct data-slot attribute", () => {
    const { container } = render(<Input />);
    expect(container.firstChild).toHaveAttribute("data-slot", "input");
  });

  it("should pass through type prop", () => {
    render(<Input type="email" placeholder="Email" />);
    expect(screen.getByPlaceholderText("Email")).toHaveAttribute("type", "email");
  });

  it("should handle input value changes", () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "test" } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it("should render disabled input", () => {
    render(<Input disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("should pass through className", () => {
    const { container } = render(<Input className="custom-input" />);
    expect(container.firstChild).toHaveClass("custom-input");
  });
});

describe("Select", () => {
  it("should render select element with options", () => {
    render(
      <Select>
        <option value="1">Option 1</option>
        <option value="2">Option 2</option>
      </Select>,
    );
    expect(screen.getByText("Option 1")).toBeInTheDocument();
    expect(screen.getByText("Option 2")).toBeInTheDocument();
  });

  it("should have correct data-slot attribute", () => {
    const { container } = render(<Select />);
    expect(container.firstChild).toHaveAttribute("data-slot", "select");
  });

  it("should handle selection changes", () => {
    const handleChange = vi.fn();
    render(
      <Select onChange={handleChange}>
        <option value="1">Option 1</option>
        <option value="2">Option 2</option>
      </Select>,
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "2" } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it("should render disabled select", () => {
    render(<Select disabled />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("should pass through className", () => {
    const { container } = render(<Select className="custom-select" />);
    expect(container.firstChild).toHaveClass("custom-select");
  });
});

describe("Tabs components", () => {
  describe("Tabs", () => {
    it("should render tabs container", () => {
      render(<Tabs>Tab Content</Tabs>);
      expect(screen.getByText("Tab Content")).toBeInTheDocument();
    });

    it("should have correct data-slot attribute", () => {
      const { container } = render(<Tabs />);
      expect(container.firstChild).toHaveAttribute("data-slot", "tabs");
    });

    it("should pass through className", () => {
      const { container } = render(<Tabs className="custom-tabs" />);
      expect(container.firstChild).toHaveClass("custom-tabs");
    });
  });

  describe("TabsList", () => {
    it("should render tabs list", () => {
      render(<TabsList>Tab List</TabsList>);
      expect(screen.getByText("Tab List")).toBeInTheDocument();
    });

    it("should have correct data-slot attribute", () => {
      const { container } = render(<TabsList />);
      expect(container.firstChild).toHaveAttribute("data-slot", "tabs-list");
    });
  });

  describe("TabsTrigger", () => {
    it("should render tab trigger button", () => {
      render(<TabsTrigger>Tab 1</TabsTrigger>);
      expect(screen.getByText("Tab 1")).toBeInTheDocument();
    });

    it("should have correct data-slot attribute", () => {
      const { container } = render(<TabsTrigger>Tab</TabsTrigger>);
      expect(container.firstChild).toHaveAttribute("data-slot", "tabs-trigger");
    });

    it("should have data-state active when active prop is true", () => {
      const { container } = render(<TabsTrigger active>Tab</TabsTrigger>);
      expect(container.firstChild).toHaveAttribute("data-state", "active");
    });

    it("should have data-state inactive when active prop is false", () => {
      const { container } = render(<TabsTrigger active={false}>Tab</TabsTrigger>);
      expect(container.firstChild).toHaveAttribute("data-state", "inactive");
    });

    it("should have data-state inactive when active prop is not provided", () => {
      const { container } = render(<TabsTrigger>Tab</TabsTrigger>);
      expect(container.firstChild).toHaveAttribute("data-state", "inactive");
    });

    it("should handle click events", () => {
      const handleClick = vi.fn();
      render(<TabsTrigger onClick={handleClick}>Tab</TabsTrigger>);
      fireEvent.click(screen.getByText("Tab"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("should render disabled tab trigger", () => {
      render(<TabsTrigger disabled>Tab</TabsTrigger>);
      expect(screen.getByText("Tab")).toBeDisabled();
    });

    it("should pass through className", () => {
      const { container } = render(<TabsTrigger className="custom-trigger">Tab</TabsTrigger>);
      expect(container.firstChild).toHaveClass("custom-trigger");
    });
  });

  describe("Full Tabs composition", () => {
    it("should render complete tabs component", () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger active>Tab 1</TabsTrigger>
            <TabsTrigger>Tab 2</TabsTrigger>
          </TabsList>
        </Tabs>,
      );

      expect(screen.getByText("Tab 1")).toBeInTheDocument();
      expect(screen.getByText("Tab 2")).toBeInTheDocument();
    });
  });
});
