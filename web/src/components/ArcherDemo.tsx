import React from "react";
import { ArcherContainer, ArcherElement } from "react-archer";

const containerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  height: "500px",
  width: "100%",
  margin: "50px 0",
};

const columnStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  flex: 1,
};

const rootContainerStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  flex: 1,
};

const boxStyle = {
  padding: "10px",
  border: "1px solid black",
  marginBottom: "20px",
};

const SecondExample = () => {
  const [nbElements, setNbElements] = React.useState(3);
  const [labels, setLabels] = React.useState("hello");

  return (
    <div>
      <div>
        <div>Change labels</div>
        <input
          data-cy="change-labels-input"
          type="text"
          onChange={(event) => setLabels(event.currentTarget.value)}
        />
      </div>
      <div>
        <div>Add elements</div>
        <button
          data-cy="add-element"
          onClick={() => setNbElements(nbElements + 1)}
        >
          +
        </button>
        <button
          onClick={() => setNbElements(nbElements > 1 ? nbElements - 1 : 0)}
        >
          -
        </button>
      </div>

      <ArcherContainer strokeColor="red">
        <div style={containerStyle}>
          {/* Left column with elements */}
          <div style={columnStyle}>
            {Array(nbElements)
              .fill(0)
              .map((_, i) => (
                <ArcherElement
                  key={`element${i}`}
                  id={`element${i}`}
                  relations={[
                    {
                      targetId: "root",
                      targetAnchor: "left",
                      sourceAnchor: "right",
                      //   label: (
                      //     <div>
                      //       {i} {labels}
                      //     </div>
                      //   ),
                    },
                  ]}
                >
                  <div style={boxStyle}>Element {i}</div>
                </ArcherElement>
              ))}
            <ArcherElement
              key={"select"}
              id={"select"}
              relations={[
                {
                  targetId: "root",
                  targetAnchor: "left",
                  sourceAnchor: "right",
                  style: { strokeDasharray: "5,5" },
                  //   label: (
                  //     <div>
                  //       {i} {labels}
                  //     </div>
                  //   ),
                },
              ]}
            >
              <div style={boxStyle}>Select</div>
            </ArcherElement>
          </div>

          {/* Root element in the center */}
          <div style={rootContainerStyle}>
            <ArcherElement
              id="root"
              relations={[
                {
                  targetId: "right-element",
                  targetAnchor: "left",
                  sourceAnchor: "right",
                  //   label: <div>Connected to Root</div>,
                },
              ]}
            >
              <div style={boxStyle}>ZETACHAIN</div>
            </ArcherElement>
          </div>

          {/* Additional element to the right of the root */}
          <div style={columnStyle}>
            <ArcherElement id="right-element">
              <div style={boxStyle}>Right Element</div>
            </ArcherElement>
          </div>
        </div>
      </ArcherContainer>
    </div>
  );
};

export default SecondExample;
