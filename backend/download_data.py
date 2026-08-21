"""Download the Official BANKING77 dataset."""

from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent
DATA_DIRECTORY = ROOT / "data"


DATASET_FILES = {
    "train.csv": (
        "https://raw.githubusercontent.com/"
        "PolyAI-LDN/task-specific-datasets/"
        "master/banking_data/train.csv"
    ),
    "test.csv": (
        "https://raw.githubusercontent.com/"
        "PolyAI-LDN/task-specific-datasets/"
        "master/banking_data/test.csv"
    ),
}


def download_file(
    url: str,
    destination: Path,
) -> None:
    """Download one file and save it locally."""

    print(f"Downloading {destination.name}...")

    response = requests.get(
        url,
        timeout=60,
    )
    response.raise_for_status()

    destination.write_bytes(response.content)

    file_size_kb = destination.stat().st_size / 1024

    print(f"Saved {destination.name}: " f"{file_size_kb: .1f} KB")


def main() -> None:
    """Download every required dataset file."""

    DATA_DIRECTORY.mkdir(parents=True, exist_ok=True)

    for filename, url in DATASET_FILES.items():
        destination = DATA_DIRECTORY / filename

        if destination.exists():
            print(f"{filename} already exists. " "Skipping download.")
            continue

        download_file(
            url=url,
            destination=destination,
        )

    print("BANKING77 dataset is ready.")


if __name__ == "__main__":
    main()
