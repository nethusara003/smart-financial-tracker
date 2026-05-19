import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import UserSearchInput from "../UserSearchInput";
import { useTransferUserSearch } from "../../../hooks/useTransfers";

// Mock the query hook
vi.mock("../../../hooks/useTransfers", () => ({
  useTransferUserSearch: vi.fn(),
}));

describe("UserSearchInput Component", () => {
  const mockOnSelectUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render placeholder text correctly", () => {
    useTransferUserSearch.mockReturnValue({ data: [], isFetching: false });
    render(<UserSearchInput onSelectUser={mockOnSelectUser} selectedUser={null} />);
    
    expect(
      screen.getByPlaceholderText(/Search by email, name, or account number/i)
    ).toBeInTheDocument();
  });

  it("should call the search hook when typing a query >= 2 chars", async () => {
    useTransferUserSearch.mockReturnValue({ data: [], isFetching: false });
    render(<UserSearchInput onSelectUser={mockOnSelectUser} selectedUser={null} />);

    const input = screen.getByPlaceholderText(/Search by email, name, or account number/i);
    fireEvent.change(input, { target: { value: "SFT-12" } });

    await waitFor(() => {
      expect(useTransferUserSearch).toHaveBeenCalledWith("SFT-12", expect.any(Object));
    });
  });

  it("should render search results including account numbers in the dropdown", async () => {
    const mockUsers = [
      {
        userId: "user-1",
        name: "Alice Johnson",
        email: "alice@example.com",
        accountNumber: "SFT-889900",
      },
    ];
    useTransferUserSearch.mockReturnValue({ data: mockUsers, isFetching: false });
    
    render(<UserSearchInput onSelectUser={mockOnSelectUser} selectedUser={null} />);
    
    const input = screen.getByPlaceholderText(/Search by email, name, or account number/i);
    fireEvent.change(input, { target: { value: "SFT-88" } });

    // dropdown is shown when query >= 2 chars and search hook returns results
    await waitFor(() => {
      expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
      expect(screen.getByText("SFT-889900")).toBeInTheDocument();
    });
  });

  it("should select recipient and render selected recipient card with account number", () => {
    const selectedUser = {
      name: "Bob Smith",
      email: "bob@example.com",
      accountNumber: "SFT-112233",
    };

    render(
      <UserSearchInput
        onSelectUser={mockOnSelectUser}
        selectedUser={selectedUser}
      />
    );

    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    expect(screen.getByText("SFT-112233")).toBeInTheDocument();
  });
});
