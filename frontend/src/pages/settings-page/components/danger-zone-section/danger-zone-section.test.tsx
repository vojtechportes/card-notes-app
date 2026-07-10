import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../../../i18n";
import { AppProviders } from "../../../../components/app-providers/app-providers";
import { DangerZoneSection } from "./danger-zone-section";

const useDeleteAllNotesMutationMock = vi.hoisted(() => vi.fn());

vi.mock("../../hooks/use-delete-all-notes-mutation", () => ({
  useDeleteAllNotesMutation: useDeleteAllNotesMutationMock,
}));

const deleteAllNotesMutation = {
  isPending: false,
  mutateAsync: vi.fn(),
};

const renderDangerZoneSection = () => {
  return render(
    <AppProviders>
      <DangerZoneSection />
    </AppProviders>,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  deleteAllNotesMutation.isPending = false;
  deleteAllNotesMutation.mutateAsync.mockResolvedValue({ deletedCount: 5 });
  useDeleteAllNotesMutationMock.mockReturnValue(deleteAllNotesMutation);
});

afterEach(() => {
  cleanup();
});

describe("DangerZoneSection", () => {
  it("renders the destructive action shell", () => {
    renderDangerZoneSection();

    expect(
      screen.getByText(
        "Permanently remove every note from your local database.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "This action deletes all note content at once and cannot be undone.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Delete all notes" }),
    ).toBeTruthy();
  });

  it("opens the confirmation dialog and does not delete when cancelled", async () => {
    renderDangerZoneSection();

    fireEvent.click(screen.getByRole("button", { name: "Delete all notes" }));

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Delete all notes" }),
    ).toBeTruthy();
    expect(
      within(dialog).getByText(
        "This permanently deletes every saved note. This action cannot be undone.",
      ),
    ).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(deleteAllNotesMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it("deletes all notes after confirmation and shows success feedback", async () => {
    renderDangerZoneSection();

    fireEvent.click(screen.getByRole("button", { name: "Delete all notes" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(
      within(dialog).getAllByRole("button", { name: "Delete all notes" })[0],
    );

    await waitFor(() => {
      expect(deleteAllNotesMutation.mutateAsync).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("Deleted 5 notes.")).toBeTruthy();
  });

  it("shows error feedback when deletion fails", async () => {
    deleteAllNotesMutation.mutateAsync.mockRejectedValueOnce(
      new Error("delete failed"),
    );
    renderDangerZoneSection();

    fireEvent.click(screen.getByRole("button", { name: "Delete all notes" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(
      within(dialog).getAllByRole("button", { name: "Delete all notes" })[0],
    );

    expect(
      await screen.findByText("All notes could not be deleted. Try again."),
    ).toBeTruthy();
  });

  it("shows the pending label and disables the action while deleting", () => {
    deleteAllNotesMutation.isPending = true;
    renderDangerZoneSection();

    const button = screen.getByRole("button", { name: "Deleting notes..." });

    expect(button.getAttribute("disabled")).not.toBeNull();
  });
});
