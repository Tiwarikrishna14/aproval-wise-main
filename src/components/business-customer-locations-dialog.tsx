import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  businessCustomerLocationsApi,
  type BusinessCustomerLocationResponse,
  type BusinessCustomerResponse,
  type CreateBusinessCustomerLocationRequest,
  type PageResponse,
  type UpdateBusinessCustomerLocationRequest,
} from "@/services/admin-api.service";

type LocationForm = {
  locationCode: string;
  locationName: string;
  city: string;
  state: string;
  address: string;
  permanentAddress: string;
  correspondingAddress: string;
  sameAsPermanentAddress: boolean;
  pincode: string;
  status: BusinessCustomerLocationResponse["status"];
};
const emptyForm: LocationForm = {
  locationCode: "",
  locationName: "",
  city: "",
  state: "",
  address: "",
  permanentAddress: "",
  correspondingAddress: "",
  sameAsPermanentAddress: false,
  pincode: "",
  status: "ACTIVE",
};
const pageSizes = [10, 20, 50];

export function BusinessCustomerLocationsDialog({
  customer,
  canCreate,
  canUpdate,
  onOpenChange,
}: {
  customer: BusinessCustomerResponse | null;
  canCreate: boolean;
  canUpdate: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessCustomerLocationResponse | null>(null);
  const [form, setForm] = useState<LocationForm>(emptyForm);
  const queryKey = ["business-customer-locations", customer?.id, page, size, search] as const;
  const locationsQuery = useQuery({
    queryKey,
    queryFn: async () =>
      (
        await businessCustomerLocationsApi.list({
          businessCustomerId: customer!.id,
          status: "ACTIVE",
          page,
          size,
          search: search || undefined,
          sort: ["updatedAt,desc"],
        })
      ).data,
    enabled: Boolean(customer),
    retry: false,
  });
  const locations = Array.isArray(locationsQuery.data)
    ? locationsQuery.data
    : (locationsQuery.data?.content ?? []);
  const pageData = Array.isArray(locationsQuery.data)
    ? undefined
    : (locationsQuery.data as PageResponse<BusinessCustomerLocationResponse> | undefined);
  const totalPages = pageData?.totalPages ?? (locations.length ? 1 : 0);
  const total = pageData?.totalElements ?? locations.length;

  useEffect(() => {
    if (totalPages > 0 && page >= totalPages) setPage(totalPages - 1);
  }, [page, totalPages]);
  useEffect(() => {
    if (!customer) {
      setSearchInput("");
      setSearch("");
      setPage(0);
      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
    }
  }, [customer]);

  const saveLocation = useMutation({
    mutationFn: async () => {
      const common = {
        locationName: form.locationName.trim(),
        city: form.city.trim(),
        state: form.state.trim() || undefined,
        address: form.address.trim() || undefined,
        permanentAddress: form.permanentAddress.trim() || undefined,
        correspondingAddress:
          (form.sameAsPermanentAddress
            ? form.permanentAddress
            : form.correspondingAddress
          ).trim() || undefined,
        sameAsPermanentAddress: form.sameAsPermanentAddress,
        pincode: form.pincode.trim() || undefined,
      };
      if (editing)
        return businessCustomerLocationsApi.update(editing.id, {
          ...common,
          status: form.status,
        } satisfies UpdateBusinessCustomerLocationRequest);
      return businessCustomerLocationsApi.create(customer!.id, {
        ...common,
        locationCode: form.locationCode.trim(),
      } satisfies CreateBusinessCustomerLocationRequest);
    },
    onSuccess: async () => {
      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      toast.success(editing ? "Location updated successfully" : "Location created successfully");
      await queryClient.invalidateQueries({
        queryKey: ["business-customer-locations", customer?.id],
      });
    },
    onError: (error) => toast.error(error.message),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }
  function openEdit(location: BusinessCustomerLocationResponse) {
    setEditing(location);
    setForm({
      locationCode: location.locationCode,
      locationName: location.locationName,
      city: location.city,
      state: location.state ?? "",
      address: location.address ?? "",
      permanentAddress: location.permanentAddress ?? "",
      correspondingAddress: location.correspondingAddress ?? "",
      sameAsPermanentAddress: location.sameAsPermanentAddress,
      pincode: location.pincode ?? "",
      status: location.status,
    });
    setFormOpen(true);
  }
  function closeForm(open: boolean) {
    if (open || saveLocation.isPending) return;
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }
  function updateField(field: keyof LocationForm, value: string | boolean) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "permanentAddress" && current.sameAsPermanentAddress)
        next.correspondingAddress = String(value);
      if (field === "sameAsPermanentAddress" && value === true)
        next.correspondingAddress = current.permanentAddress;
      return next;
    });
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((!editing && !canCreate) || (editing && !canUpdate)) return;
    saveLocation.mutate();
  }

  return (
    <>
      <Dialog
        open={Boolean(customer)}
        onOpenChange={(open) => {
          if (!open && !saveLocation.isPending) onOpenChange(false);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Locations - {customer?.name}</DialogTitle>
            <DialogDescription>
              Active saved locations for this business customer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search name, code, or city"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setPage(0);
                  setSearch(searchInput.trim());
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPage(0);
                setSearch(searchInput.trim());
              }}
            >
              <Search className="mr-1.5 h-4 w-4" />
              Search
            </Button>
            {canCreate ? (
              <Button type="button" onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" />
                New Location
              </Button>
            ) : null}
          </div>
          {locationsQuery.isError ? (
            <InlineError message={locationsQuery.error.message} />
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] text-sm">
                  <thead className="bg-surface text-[11px] uppercase tracking-normal text-muted-foreground">
                    <tr>
                      {[
                        "Code",
                        "Location",
                        "City",
                        "State",
                        "Pincode",
                        "Permanent Address",
                        "Corresponding Address",
                        "Same as Permanent",
                        "Status",
                        ...(canUpdate ? ["Actions"] : []),
                      ].map((header) => (
                        <th
                          key={header}
                          className="whitespace-normal px-3 py-3 text-left font-medium"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {locationsQuery.isLoading ? (
                      <LoadingRows columns={canUpdate ? 10 : 9} />
                    ) : locations.length ? (
                      locations.map((location) => (
                        <tr key={location.id} className="border-t">
                          <td className="px-3 py-3 font-medium">{location.locationCode}</td>
                          <td className="px-3 py-3">{location.locationName}</td>
                          <td className="px-3 py-3">{location.city}</td>
                          <td className="px-3 py-3">{location.state || "-"}</td>
                          <td className="px-3 py-3">{location.pincode || "-"}</td>
                          <td className="max-w-48 whitespace-normal break-words px-3 py-3">
                            {location.permanentAddress || "-"}
                          </td>
                          <td className="max-w-48 whitespace-normal break-words px-3 py-3">
                            {location.correspondingAddress || "-"}
                          </td>
                          <td className="px-3 py-3">
                            {location.sameAsPermanentAddress ? "Yes" : "No"}
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge
                              status={location.status === "ACTIVE" ? "Approved" : "Cancelled"}
                            />
                          </td>
                          {canUpdate ? (
                            <td className="px-3 py-3">
                              <Button size="sm" variant="ghost" onClick={() => openEdit(location)}>
                                <Pencil className="mr-1 h-3.5 w-3.5" />
                                Edit
                              </Button>
                            </td>
                          ) : null}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={canUpdate ? 10 : 9}
                          className="px-4 py-10 text-center text-muted-foreground"
                        >
                          No active locations found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>{total ? `${total} location(s)` : "No locations"}</span>
                <div className="flex items-center gap-2">
                  <Label htmlFor="location-size">Rows</Label>
                  <select
                    id="location-size"
                    className="h-8 rounded-md border bg-background px-2"
                    value={size}
                    onChange={(event) => {
                      setPage(0);
                      setSize(Number(event.target.value));
                    }}
                  >
                    {pageSizes.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                  <span>
                    Page {totalPages ? page + 1 : 0} of {totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === 0 || locationsQuery.isLoading}
                    onClick={() => setPage((current) => Math.max(0, current - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!totalPages || page >= totalPages - 1 || locationsQuery.isLoading}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={formOpen} onOpenChange={closeForm}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Location" : "Create Location"}</DialogTitle>
            <DialogDescription>
              Save the customer delivery and correspondence address.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              {!editing ? (
                <Field label="Location Code" id="location-code">
                  <Input
                    id="location-code"
                    value={form.locationCode}
                    onChange={(event) => updateField("locationCode", event.target.value)}
                    required
                  />
                </Field>
              ) : null}
              <Field label="Location Name" id="location-name">
                <Input
                  id="location-name"
                  value={form.locationName}
                  onChange={(event) => updateField("locationName", event.target.value)}
                  required
                />
              </Field>
              <Field label="City" id="location-city">
                <Input
                  id="location-city"
                  value={form.city}
                  onChange={(event) => updateField("city", event.target.value)}
                  required
                />
              </Field>
              <Field label="State" id="location-state">
                <Input
                  id="location-state"
                  value={form.state}
                  onChange={(event) => updateField("state", event.target.value)}
                />
              </Field>
              <Field label="Pincode" id="location-pincode">
                <Input
                  id="location-pincode"
                  inputMode="numeric"
                  value={form.pincode}
                  onChange={(event) =>
                    updateField("pincode", event.target.value.replace(/\D/g, ""))
                  }
                />
              </Field>
              <Field label="Address" id="location-address">
                <Input
                  id="location-address"
                  value={form.address}
                  onChange={(event) => updateField("address", event.target.value)}
                />
              </Field>
              <Field label="Permanent Address" id="location-permanent">
                <textarea
                  id="location-permanent"
                  className="input min-h-20"
                  value={form.permanentAddress}
                  onChange={(event) => updateField("permanentAddress", event.target.value)}
                />
              </Field>
              <Field label="Corresponding Address" id="location-corresponding">
                <textarea
                  id="location-corresponding"
                  className="input min-h-20 disabled:opacity-60"
                  value={form.correspondingAddress}
                  disabled={form.sameAsPermanentAddress}
                  onChange={(event) => updateField("correspondingAddress", event.target.value)}
                />
              </Field>
              {editing ? (
                <Field label="Status" id="location-status">
                  <select
                    id="location-status"
                    className="h-10 w-full rounded-md border bg-background px-3"
                    value={form.status}
                    onChange={(event) => updateField("status", event.target.value)}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </Field>
              ) : null}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.sameAsPermanentAddress}
                onCheckedChange={(value) => updateField("sameAsPermanentAddress", value === true)}
              />
              Corresponding address is same as permanent address
            </label>
            {saveLocation.error ? <InlineError message={saveLocation.error.message} /> : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={saveLocation.isPending}
                onClick={() => closeForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  saveLocation.isPending ||
                  !form.locationName.trim() ||
                  !form.city.trim() ||
                  (!editing && !form.locationCode.trim())
                }
              >
                {saveLocation.isPending ? "Saving..." : "Save Location"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
function InlineError({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </div>
  );
}
function LoadingRows({ columns }: { columns: number }) {
  return Array.from({ length: 5 }).map((_, row) => (
    <tr key={row} className="border-t">
      {Array.from({ length: columns }).map((__, col) => (
        <td key={col} className="px-3 py-3">
          <Skeleton className="h-5 w-full" />
        </td>
      ))}
    </tr>
  ));
}
